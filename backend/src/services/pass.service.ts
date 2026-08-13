import jwt from 'jsonwebtoken';
import { Pass } from '../models/Pass';
import { Booking } from '../models/Booking';
import { Event } from '../models/Event';
import { User } from '../models/User';
import { createError } from '../middleware/error.middleware';
import { writeAuditLog } from '../utils/auditLog';

interface QRPayload {
  passId: string;
  eventId: string;
  userId: string;
}

// ─── Get My Passes ────────────────────────────────────────────────────────────

export async function getMyPasses(userId: string) {
  const now = new Date();

  // Individual passes owned by user + group passes where user is in memberIds
  const passes = await Pass.find({
    $or: [
      { userId, passType: 'individual' },
      { userId, passType: { $exists: false } },   // legacy passes without passType
      { memberIds: userId, passType: 'group' },
    ],
  })
    .populate({
      path: 'eventId',
      select: 'title images date startTime endTime locationName status hostId',
      populate: { path: 'hostId', select: 'name username profileImage' },
    })
    .sort({ createdAt: -1 })
    .limit(200); // bound in-memory categorisation for very large passbooks

  const upcoming = passes.filter((p) => {
    const event = p.eventId as { date?: Date };
    return (p.status === 'active' || p.status === 'pending_verification') && event?.date && new Date(event.date) >= now;
  });
  const past = passes.filter((p) => {
    const event = p.eventId as { date?: Date };
    return p.status === 'used' || (p.status === 'active' && event?.date && new Date(event.date) < now);
  });
  const cancelled = passes.filter((p) => p.status === 'cancelled' || p.status === 'expired');

  return { upcoming, past, cancelled };
}

// ─── Get Pass By ID (with QR) ─────────────────────────────────────────────────

export async function getPassById(passId: string, userId: string) {
  const pass = await Pass.findById(passId)
    .populate('eventId', 'title date startTime endTime locationName address status')
    .populate('userId', 'name username profileImage');

  if (!pass) throw createError('Pass not found', 404);

  // Individual: must be owner. Group: must be in memberIds or creator
  const isOwner  = pass.userId._id
    ? pass.userId._id.toString() === userId
    : pass.userId.toString() === userId;
  const isMember = pass.passType === 'group' && pass.memberIds?.some((m) => m.toString() === userId);
  if (!isOwner && !isMember) throw createError('Forbidden', 403);

  if (pass.status === 'cancelled') throw createError('Pass has been cancelled', 400);

  // QR is withheld until payment is verified by admin
  if (pass.status === 'pending_verification') {
    return { ...pass.toObject(), qrToken: null, qrCodeUrl: null };
  }

  // Generate a fresh scannable JWT token so the frontend can render a real QR code.
  const eventId = (pass.eventId as { _id?: unknown })?._id?.toString() ?? pass.eventId.toString();
  const ownerId = (pass.userId as { _id?: unknown })?._id?.toString() ?? pass.userId.toString();

  const qrToken = jwt.sign(
    { passId: pass._id.toString(), eventId, userId: ownerId },
    process.env.JWT_SECRET as string,
    { expiresIn: '365d' },
  );

  return { ...pass.toObject(), qrToken };
}

// ─── Verify QR Pass (read-only, no check-in) ─────────────────────────────────

export async function verifyPass(qrToken: string, scannerId: string, scannerEventId: string) {
  let payload: QRPayload;
  try {
    payload = jwt.verify(qrToken, process.env.JWT_SECRET as string) as QRPayload;
  } catch {
    throw createError('Invalid QR code', 400);
  }

  const { passId, eventId } = payload;
  if (eventId !== scannerEventId) throw createError('QR code is for a different event', 400);

  const pass = await Pass.findById(passId)
    .populate('userId', 'name username profileImage')
    .populate('eventId', 'title date startTime status');

  if (!pass) throw createError('Pass not found', 404);

  const event   = pass.eventId as { status?: string; title?: string; date?: Date };
  const user    = pass.userId  as { name?: string; username?: string; profileImage?: string };
  const booking = await Booking.findById(pass.bookingId);
  const bookingConfirmed = booking && ['confirmed', 'checked_in'].includes(booking.status);

  return {
    valid: pass.status === 'active' && bookingConfirmed && event?.status !== 'cancelled',
    passStatus: pass.status,
    passType:   pass.passType ?? 'individual',
    memberCount: pass.passType === 'group' ? (pass.memberIds?.length ?? 0) : 1,
    bookingConfirmed: !!bookingConfirmed,
    guest: { name: user?.name, username: user?.username, profileImage: user?.profileImage },
    event: { title: event?.title, date: event?.date },
  };
}

// ─── Scan QR Pass (Scanner / Host) ───────────────────────────────────────────

export async function scanPass(qrToken: string, scannerId: string, scannerEventId: string) {
  await writeAuditLog({
    actorId: scannerId,
    action:  'QR_SCAN_ATTEMPT',
    targetType: 'Pass',
    metadata: { scannerEventId },
  });

  // 1. Verify JWT
  let payload: QRPayload;
  try {
    payload = jwt.verify(qrToken, process.env.JWT_SECRET as string) as QRPayload;
  } catch {
    await writeAuditLog({ actorId: scannerId, action: 'QR_SCAN_INVALID_TOKEN' });
    throw createError('Invalid QR code', 400);
  }

  const { passId, eventId } = payload;

  // 2. Event must match
  if (eventId !== scannerEventId) {
    await writeAuditLog({ actorId: scannerId, action: 'QR_SCAN_WRONG_EVENT', metadata: { passId, eventId } });
    throw createError('QR code is for a different event', 400);
  }

  // 3. Look up pass
  const pass = await Pass.findById(passId)
    .populate('userId', 'name username profileImage')
    .populate('eventId', 'title date startTime status');

  if (!pass) throw createError('Pass not found', 404);

  // 4. Status checks
  if (pass.status === 'used')      throw createError('Pass already used', 409);
  if (pass.status === 'cancelled') throw createError('Pass has been cancelled', 400);
  if (pass.status === 'expired')   throw createError('Pass has expired', 400);

  // 5. Event status
  const event = pass.eventId as { status?: string; title?: string; date?: Date };
  if (event?.status === 'cancelled') throw createError('Event has been cancelled', 400);

  // 6. Booking check (creator's booking for group, owner's for individual)
  const booking = await Booking.findById(pass.bookingId);
  if (!booking || !['confirmed', 'checked_in'].includes(booking.status)) {
    throw createError('Booking is not confirmed', 400);
  }

  const now = new Date();

  // ─── GROUP PASS: bulk check-in all members ──────────────────────────────
  if (pass.passType === 'group' && pass.memberIds && pass.memberIds.length > 0) {
    const memberIds = pass.memberIds.map((m) => m.toString());

    // Mark group pass as used
    await Pass.findByIdAndUpdate(passId, { status: 'used', checkedInAt: now, scannedBy: scannerId });

    // Mark all individual passes for these members on this event as used
    await Pass.updateMany(
      { eventId, userId: { $in: pass.memberIds }, passType: { $in: ['individual', null, undefined] }, status: 'active' },
      { status: 'used', checkedInAt: now, scannedBy: scannerId }
    );

    // Confirm all their bookings as checked_in
    const memberBookings = await Booking.find({
      eventId,
      userId: { $in: pass.memberIds },
      status: { $in: ['confirmed', 'checked_in'] },
    }).select('_id status');

    const toUpdate = memberBookings.filter((b) => b.status !== 'checked_in');
    if (toUpdate.length > 0) {
      await Booking.updateMany(
        { _id: { $in: toUpdate.map((b) => b._id) } },
        { status: 'checked_in' }
      );
      // Increment checkedInCount by the number of newly checked-in members
      await Event.findByIdAndUpdate(eventId, { $inc: { checkedInCount: toUpdate.length } });
    }

    await writeAuditLog({
      actorId:    scannerId,
      action:     'QR_SCAN_GROUP_SUCCESS',
      targetType: 'Pass',
      targetId:   passId,
      metadata:   { eventId, memberIds, count: memberIds.length },
    });

    const user = pass.userId as { name?: string; username?: string; profileImage?: string };

    return {
      success:     true,
      message:     `Group Entry Approved — ${memberIds.length} members checked in`,
      passType:    'group',
      memberCount: memberIds.length,
      guest: { name: user?.name, username: user?.username, profileImage: user?.profileImage },
      event:  { title: event?.title, date: event?.date },
      checkedInAt: now,
    };
  }

  // ─── INDIVIDUAL PASS ─────────────────────────────────────────────────────
  await Pass.findByIdAndUpdate(passId, { status: 'used', checkedInAt: now, scannedBy: scannerId });
  await Booking.findByIdAndUpdate(pass.bookingId, { status: 'checked_in' });
  await Event.findByIdAndUpdate(eventId, { $inc: { checkedInCount: 1 } });

  await writeAuditLog({
    actorId:    scannerId,
    action:     'QR_SCAN_SUCCESS',
    targetType: 'Pass',
    targetId:   passId,
    metadata:   { eventId, userId: payload.userId },
  });

  const user = pass.userId as { name?: string; username?: string; profileImage?: string };

  return {
    success:     true,
    message:     'Entry Approved',
    passType:    'individual',
    memberCount: 1,
    guest: { name: user?.name, username: user?.username, profileImage: user?.profileImage },
    event:  { title: event?.title, date: event?.date },
    checkedInAt: now,
  };
}
