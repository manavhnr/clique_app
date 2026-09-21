import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { Booking, IBooking } from '../models/Booking';
import { Event } from '../models/Event';
import { Pass } from '../models/Pass';
import { JoinRequest } from '../models/JoinRequest';
import { User } from '../models/User';
import { createError } from '../middleware/error.middleware';
import { writeAuditLog } from '../utils/auditLog';
import { uploadBuffer } from '../utils/cloudinary';
import { incrementEventAttendance } from './cliquescore.service';
import { notifyBookingConfirmed } from './notification.service';
import { getUserActiveDiscount, markDiscountUsed, applyDiscount } from './discount.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export async function generatePass(bookingId: string, userId: string, eventId: string) {
  // Create pass record first to get passId
  const tempHash = crypto.randomBytes(16).toString('hex');
  const pass = await Pass.create({ bookingId, userId, eventId, qrTokenHash: tempHash, status: 'active' });

  // JWT payload — signed with JWT_SECRET, contains passId + eventId for scanner validation
  const qrPayload = jwt.sign(
    { passId: pass._id.toString(), eventId, userId },
    process.env.JWT_SECRET as string,
    { expiresIn: '365d' }
  );

  // Hash of JWT stored in DB — used for uniqueness and tamper detection
  const qrTokenHash = crypto.createHash('sha256').update(qrPayload).digest('hex');

  // Generate QR code as PNG buffer and upload to Cloudinary CDN
  const qrBuffer  = await QRCode.toBuffer(qrPayload, { type: 'png', width: 400, margin: 2 });
  const qrCodeUrl = await uploadBuffer(qrBuffer, pass._id.toString());

  await Pass.findByIdAndUpdate(pass._id, { qrTokenHash, qrCodeUrl });

  return { ...pass.toObject(), qrCodeUrl, _qrPayload: qrPayload };
}

// ─── Create Booking ───────────────────────────────────────────────────────────

export async function createBooking(userId: string, eventId: string, tierLabel?: string, groupPricingIndex?: number) {
  const event = await Event.findById(eventId);
  if (!event) throw createError('Event not found', 404);
  if (event.status !== 'published') throw createError('Event is not available for booking', 400);
  if (event.hostId.toString() === userId) throw createError('Host cannot book own event', 400);

  // Duplicate booking check
  const existing = await Booking.findOne({ userId, eventId, status: { $nin: ['cancelled', 'refunded', 'rejected'] } });
  if (existing) throw createError('Already booked this event', 409);

  // Private event — must have approved request
  if (event.privacy === 'private' && event.approvalRequired) {
    const request = await JoinRequest.findOne({ userId, eventId, status: 'approved' });
    if (!request) throw createError('Access not approved for this private event', 403);
  }

  // Resolve the active tier — first open tier with remaining capacity
  const hasPhases = event.pricingTiers?.length > 0;
  const activeTier = hasPhases
    ? event.pricingTiers.find((t) => t.isOpen && (!t.capacity || t.soldCount < t.capacity))
    : null;

  if (hasPhases && !activeTier) {
    throw createError('No tickets available right now — the host hasn\'t opened the next phase yet', 400);
  }

  // Group pricing override
  let groupOffer: { label: string; size: number; price: number } | null = null;
  if (groupPricingIndex !== undefined && groupPricingIndex !== null) {
    const gp = event.groupPricing ?? [];
    if (groupPricingIndex < 0 || groupPricingIndex >= gp.length) {
      throw createError('Invalid group pricing selection', 400);
    }
    groupOffer = gp[groupPricingIndex] as { label: string; size: number; price: number };
  }

  const bookingUser = await import('../models/User').then(m => m.User.findById(userId).select('gender').lean());
  const gender = bookingUser?.gender as string | undefined;
  const ticketPrice = groupOffer
    ? groupOffer.price
    : activeTier
      ? event.pricingMode === 'split'
        ? gender === 'male' ? activeTier.malePrice
          : gender === 'female' ? activeTier.femalePrice
          : activeTier.commonPrice
        : activeTier.commonPrice
      : event.price;
  const resolvedTierLabel = groupOffer
    ? (groupOffer.label || `Group of ${groupOffer.size}`)
    : activeTier?.label || tierLabel || 'General';
  const tierId = (activeTier as (typeof activeTier & { _id?: unknown }) | null)?._id;

  // Apply user-specific discount if one exists for this event
  const activeDiscount = await getUserActiveDiscount(userId, eventId);
  const finalPrice = activeDiscount ? applyDiscount(ticketPrice, activeDiscount) : ticketPrice;

  const groupSize = groupOffer?.size ?? 1;
  const isFree = finalPrice === 0;
  const bookingStatus = isFree ? 'confirmed' : 'payment_pending';

  // Wrap the capacity claim and booking creation in a transaction.
  // If Booking.create() fails for any reason the $inc is rolled back automatically —
  // no manual counter surgery needed.
  const session = await mongoose.startSession();
  let booking: IBooking | null = null;
  let updatedEvent: typeof event | null = null;
  try {
    await session.withTransaction(async () => {
      // Re-check for duplicates under the session to close the race window between
      // the earlier guard and the actual insert.
      const dup = await Booking.findOne(
        { userId, eventId, status: { $nin: ['cancelled', 'refunded', 'rejected'] } },
        null,
        { session }
      );
      if (dup) throw createError('Already booked this event', 409);

      // Atomically claim slots (group bookings claim groupSize slots at once).
      // Capacity is checked against confirmed + reserved so payment_pending slots don't overbook.
      // Only confirmed bookings increment bookedCount; paid bookings increment reservedCount until payment clears.
      const capacityQuery = {
        _id: eventId,
        status: 'published',
        $expr: { $lte: [{ $add: ['$bookedCount', { $ifNull: ['$reservedCount', 0] }, groupSize] }, '$capacity'] },
      };
      const countField = isFree ? 'bookedCount' : 'reservedCount';
      const ev = tierId
        ? await Event.findOneAndUpdate(
            capacityQuery,
            { $inc: { [countField]: groupSize, 'pricingTiers.$[tier].soldCount': 1 } },
            { new: true, arrayFilters: [{ 'tier._id': tierId }], session }
          )
        : await Event.findOneAndUpdate(capacityQuery, { $inc: { [countField]: groupSize } }, { new: true, session });
      if (!ev) throw createError('Event is fully booked', 409);
      updatedEvent = ev;

      // Create the booking — any failure here aborts the transaction and rolls back the $inc.
      const [created] = await Booking.create(
        [{ userId, eventId, hostId: event.hostId, status: bookingStatus, amount: finalPrice, tierLabel: resolvedTierLabel, groupSize }],
        { session }
      );
      booking = created as unknown as IBooking;
    });
  } finally {
    await session.endSession();
  }

  if (!booking) throw createError('Booking creation failed', 500);
  const confirmedBooking = booking as IBooking;

  // Mark discount consumed — best-effort, outside the transaction (duplicate booking check
  // prevents the same user from booking again, so a failure here is harmless).
  if (activeDiscount) {
    void markDiscountUsed(activeDiscount._id.toString(), confirmedBooking._id.toString());
  }

  // Auto-close this tier if it just sold out (best-effort, outside the transaction).
  if (activeTier?.capacity && tierId && updatedEvent) {
    const updatedTier = (updatedEvent as typeof event).pricingTiers.find(
      (t) => t._id?.toString() === tierId.toString()
    );
    if (updatedTier && updatedTier.soldCount >= (updatedTier.capacity ?? Infinity)) {
      await Event.updateOne(
        { _id: eventId, 'pricingTiers._id': tierId },
        { $set: { 'pricingTiers.$.isOpen': false } }
      );
    }
  }

  // Free event — generate pass immediately
  let pass = null;
  if (isFree) {
    pass = await generatePass(confirmedBooking._id.toString(), userId, eventId);
    await Booking.findByIdAndUpdate(confirmedBooking._id, { passId: pass._id });
    await incrementEventAttendance(userId);
    void notifyBookingConfirmed(userId, event.title, pass._id.toString());

    await writeAuditLog({
      actorId: userId,
      action: 'FREE_BOOKING_CONFIRMED',
      targetType: 'Booking',
      targetId: confirmedBooking._id.toString(),
    });
  }

  return { booking: confirmedBooking, pass };
}

// ─── Confirm Booking (called after payment verified) ─────────────────────────

export async function confirmBookingAfterPayment(bookingId: string, paymentId: string) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw createError('Booking not found', 404);
  if (!['payment_pending', 'utr_submitted'].includes(booking.status)) throw createError('Booking not in payment_pending state', 400);

  const event = await Event.findById(booking.eventId).select('title');
  const pass = await generatePass(bookingId, booking.userId.toString(), booking.eventId.toString());

  await Booking.findByIdAndUpdate(bookingId, {
    status: 'confirmed',
    paymentId: new mongoose.Types.ObjectId(paymentId),
    passId: pass._id,
  });

  // Move slot from reserved → confirmed, and record revenue
  const slotsConfirmed = booking.groupSize ?? 1;
  await Event.findByIdAndUpdate(booking.eventId, {
    $inc: { bookedCount: slotsConfirmed, reservedCount: -slotsConfirmed, revenue: booking.amount },
  });
  await incrementEventAttendance(booking.userId.toString());
  void notifyBookingConfirmed(booking.userId.toString(), event?.title || 'the event', pass._id.toString());

  await writeAuditLog({
    actorId: booking.userId.toString(),
    action: 'BOOKING_CONFIRMED',
    targetType: 'Booking',
    targetId: bookingId,
    metadata: { paymentId },
  });

  return { booking, pass };
}

// ─── Cancel Booking ───────────────────────────────────────────────────────────

export async function cancelBooking(bookingId: string, userId: string) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw createError('Booking not found', 404);
  if (booking.userId.toString() !== userId) throw createError('Forbidden', 403);

  const cancellable = ['pending', 'payment_pending', 'utr_submitted', 'confirmed'];
  if (!cancellable.includes(booking.status)) {
    throw createError(`Cannot cancel a booking with status: ${booking.status}`, 400);
  }

  // Refund any captured payment before finalising the status. Lazy import breaks the
  // booking.service <-> payment.service require cycle.
  let refunded = false;
  try {
    const { refundBookingPayment } = await import('./payment.service');
    refunded = await refundBookingPayment(bookingId, userId);
  } catch (err) {
    // Surface refund failures instead of silently cancelling a paid booking with no refund
    throw createError(
      'Could not process refund for this booking. Please try again or contact support.',
      502
    );
  }

  await Booking.findByIdAndUpdate(bookingId, { status: refunded ? 'refunded' : 'cancelled' });

  // Invalidate pass if exists
  if (booking.passId) {
    await Pass.findByIdAndUpdate(booking.passId, { status: 'cancelled' });
  }

  // Release capacity slots — decrement the correct counter based on what was incremented at booking time.
  const slotsToRelease = booking.groupSize ?? 1;
  const wasReserved = ['payment_pending', 'utr_submitted'].includes(booking.status);
  const revenueDecrement = booking.status === 'confirmed' ? -booking.amount : 0;
  const countField = wasReserved ? 'reservedCount' : 'bookedCount';
  await Event.findByIdAndUpdate(booking.eventId, {
    $inc: { [countField]: -slotsToRelease, revenue: revenueDecrement },
  });

  // Decrement soldCount on the pricing tier that was booked.
  if (booking.tierLabel) {
    await Event.updateOne(
      { _id: booking.eventId, 'pricingTiers.label': booking.tierLabel },
      { $inc: { 'pricingTiers.$.soldCount': -1 } }
    );
  }

  await writeAuditLog({
    actorId: userId,
    action: refunded ? 'BOOKING_REFUNDED' : 'BOOKING_CANCELLED',
    targetType: 'Booking',
    targetId: bookingId,
  });
}

// ─── Get My Bookings ──────────────────────────────────────────────────────────

export async function getMyBookings(userId: string, page: number, limit: number) {
  const bookings = await Booking.find({ userId })
    .populate('eventId', 'title images date startTime locationName status')
    .populate('passId', 'status qrTokenHash')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Booking.countDocuments({ userId });
  return { bookings, total, page, limit };
}

// ─── Add to Guestlist (host grants complimentary pass) ───────────────────────

export async function addToGuestlist(hostId: string, eventId: string, username: string) {
  const event = await Event.findById(eventId).select('hostId title status capacity bookedCount');
  if (!event) throw createError('Event not found', 404);
  if (event.hostId.toString() !== hostId) throw createError('Access denied', 403);
  if (!['draft', 'published'].includes(event.status)) throw createError('Cannot add guests to a cancelled or completed event', 400);

  const user = await User.findOne({ username: username.toLowerCase().trim() }).select('_id name username');
  if (!user) throw createError(`No user found with username @${username}`, 404);
  if (user._id.toString() === hostId) throw createError('Host cannot add themselves to the guestlist', 400);

  const existing = await Booking.findOne({ userId: user._id, eventId, status: { $nin: ['cancelled', 'refunded', 'rejected'] } });
  if (existing) throw createError(`@${username} already has a booking for this event`, 409);

  const session = await mongoose.startSession();
  let booking: IBooking | null = null;
  try {
    await session.withTransaction(async () => {
      const ev = await Event.findOneAndUpdate(
        { _id: eventId, $expr: { $lte: [{ $add: ['$bookedCount', { $ifNull: ['$reservedCount', 0] }, 1] }, '$capacity'] } },
        { $inc: { bookedCount: 1 } },
        { new: true, session }
      );
      if (!ev) throw createError('Event is at full capacity', 409);

      const [created] = await Booking.create(
        [{ userId: user._id, eventId, hostId: event.hostId, status: 'confirmed', amount: 0, tierLabel: 'Guestlist', groupSize: 1 }],
        { session }
      );
      booking = created as unknown as IBooking;
    });
  } finally {
    await session.endSession();
  }

  if (!booking) throw createError('Failed to create guestlist entry', 500);
  const confirmedBooking = booking as IBooking;

  const pass = await generatePass(confirmedBooking._id.toString(), user._id.toString(), eventId);
  await Booking.findByIdAndUpdate(confirmedBooking._id, { passId: pass._id });
  void notifyBookingConfirmed(user._id.toString(), event.title, pass._id.toString());

  await writeAuditLog({
    actorId: hostId,
    action: 'GUESTLIST_ADD',
    targetType: 'Booking',
    targetId: confirmedBooking._id.toString(),
    metadata: { addedUserId: user._id.toString(), username },
  });

  return { booking: confirmedBooking, pass, user: { _id: user._id, name: user.name, username: user.username } };
}

// ─── Get Event Bookings (host view) ──────────────────────────────────────────

export async function getEventBookings(hostId: string, eventId: string) {
  const event = await Event.findById(eventId).select('hostId coHosts');
  if (!event) throw createError('Event not found', 404);
  const isHost = event.hostId.toString() === hostId;
  const isCoHost = event.coHosts.some((c) => c.userId.toString() === hostId);
  if (!isHost && !isCoHost) throw createError('Access denied', 403);

  const populate = { path: 'userId', select: 'name username profileImage connectedSocials gender age city cliquescore phone' };
  const select   = 'userId status amount tierLabel groupSize passId createdAt';

  const [bookings, inProcess, droppedOff] = await Promise.all([
    Booking.find({ eventId, status: { $in: ['confirmed', 'checked_in'] } })
      .populate(populate).select(select).sort({ createdAt: -1 }),
    Booking.find({ eventId, status: { $in: ['pending', 'payment_pending', 'utr_submitted'] } })
      .populate(populate).select(select).sort({ createdAt: -1 }),
    Booking.find({ eventId, status: { $in: ['cancelled', 'refunded', 'rejected'] } })
      .populate(populate).select(select).sort({ createdAt: -1 }),
  ]);

  return { bookings, inProcess, droppedOff };
}
