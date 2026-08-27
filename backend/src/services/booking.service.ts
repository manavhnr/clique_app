import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { Booking } from '../models/Booking';
import { Event } from '../models/Event';
import { Pass } from '../models/Pass';
import { JoinRequest } from '../models/JoinRequest';
import { createError } from '../middleware/error.middleware';
import { writeAuditLog } from '../utils/auditLog';
import { uploadBuffer } from '../utils/cloudinary';
import { incrementEventAttendance } from './cliquescore.service';
import { notifyBookingConfirmed } from './notification.service';

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

export async function createBooking(userId: string, eventId: string, tierLabel?: string) {
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

  const ticketPrice = activeTier ? activeTier.commonPrice : event.price;
  const resolvedTierLabel = activeTier?.label || tierLabel || 'General';
  const tierId = (activeTier as (typeof activeTier & { _id?: unknown }) | null)?._id;

  // Atomic global capacity check + tier soldCount increment
  const capacityQuery = { _id: eventId, status: 'published', $expr: { $lt: ['$bookedCount', '$capacity'] } };
  const updated = tierId
    ? await Event.findOneAndUpdate(
        capacityQuery,
        { $inc: { bookedCount: 1, 'pricingTiers.$[tier].soldCount': 1 } },
        { new: true, arrayFilters: [{ 'tier._id': tierId }] }
      )
    : await Event.findOneAndUpdate(capacityQuery, { $inc: { bookedCount: 1 } }, { new: true });
  if (!updated) throw createError('Event is fully booked', 409);

  // Auto-close this tier if it just sold out
  if (activeTier?.capacity && tierId) {
    const updatedTier = updated.pricingTiers.find((t) => t._id?.toString() === tierId.toString());
    if (updatedTier && updatedTier.soldCount >= (updatedTier.capacity ?? Infinity)) {
      await Event.updateOne(
        { _id: eventId, 'pricingTiers._id': tierId },
        { $set: { 'pricingTiers.$.isOpen': false } }
      );
    }
  }

  // Determine initial booking status
  const isFree = ticketPrice === 0;
  const bookingStatus = isFree ? 'confirmed' : 'payment_pending';

  const booking = await Booking.create({
    userId,
    eventId,
    hostId: event.hostId,
    status: bookingStatus,
    amount: ticketPrice,
    tierLabel: resolvedTierLabel,
  });

  // Free event — generate pass immediately
  let pass = null;
  if (isFree) {
    pass = await generatePass(booking._id.toString(), userId, eventId);
    await Booking.findByIdAndUpdate(booking._id, { passId: pass._id });
    await incrementEventAttendance(userId);
    void notifyBookingConfirmed(userId, event.title, pass._id.toString());

    await writeAuditLog({
      actorId: userId,
      action: 'FREE_BOOKING_CONFIRMED',
      targetType: 'Booking',
      targetId: booking._id.toString(),
    });
  }

  return { booking, pass };
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

  // Release capacity slot
  await Event.findByIdAndUpdate(booking.eventId, { $inc: { bookedCount: -1 } });

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

// ─── Get Event Bookings (host view) ──────────────────────────────────────────

export async function getEventBookings(hostId: string, eventId: string) {
  const event = await Event.findById(eventId).select('hostId');
  if (!event) throw createError('Event not found', 404);
  if (event.hostId.toString() !== hostId) throw createError('Access denied', 403);

  const bookings = await Booking.find({ eventId, status: { $nin: ['cancelled', 'refunded', 'rejected'] } })
    .populate({ path: 'userId', select: '+phone name username profileImage connectedSocials gender age city cliquescore' })
    .select('userId status amount tierLabel passId createdAt')
    .sort({ createdAt: -1 });

  return { bookings };
}
