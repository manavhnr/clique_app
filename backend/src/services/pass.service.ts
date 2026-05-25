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

  const passes = await Pass.find({ userId })
    .populate({
      path: 'eventId',
      select: 'title images date startTime endTime locationName status hostId',
      populate: { path: 'hostId', select: 'name username profileImage' },
    })
    .sort({ createdAt: -1 });

  const upcoming = passes.filter((p) => {
    const event = p.eventId as { date?: Date };
    return p.status === 'active' && event?.date && new Date(event.date) >= now;
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
  if (pass.userId._id.toString() !== userId) throw createError('Forbidden', 403);
  if (pass.status === 'cancelled') throw createError('Pass has been cancelled', 400);

  return pass;
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

  const event = pass.eventId as { status?: string; title?: string; date?: Date };
  const user = pass.userId as { name?: string; username?: string; profileImage?: string };

  const booking = await Booking.findById(pass.bookingId);
  const bookingConfirmed = booking && ['confirmed', 'checked_in'].includes(booking.status);

  return {
    valid: pass.status === 'active' && bookingConfirmed && event?.status !== 'cancelled',
    passStatus: pass.status,
    bookingConfirmed: !!bookingConfirmed,
    guest: { name: user?.name, username: user?.username, profileImage: user?.profileImage },
    event: { title: event?.title, date: event?.date },
  };
}

// ─── Scan QR Pass (Scanner / Host) ───────────────────────────────────────────

export async function scanPass(qrToken: string, scannerId: string, scannerEventId: string) {
  await writeAuditLog({
    actorId: scannerId,
    action: 'QR_SCAN_ATTEMPT',
    targetType: 'Pass',
    metadata: { scannerEventId },
  });

  // 1. Verify JWT signature
  let payload: QRPayload;
  try {
    payload = jwt.verify(qrToken, process.env.JWT_SECRET as string) as QRPayload;
  } catch {
    await writeAuditLog({ actorId: scannerId, action: 'QR_SCAN_INVALID_TOKEN' });
    throw createError('Invalid QR code', 400);
  }

  const { passId, eventId } = payload;

  // 2. Event must match scanner's event
  if (eventId !== scannerEventId) {
    await writeAuditLog({ actorId: scannerId, action: 'QR_SCAN_WRONG_EVENT', metadata: { passId, eventId } });
    throw createError('QR code is for a different event', 400);
  }

  // 3. Look up pass
  const pass = await Pass.findById(passId)
    .populate('userId', 'name username profileImage')
    .populate('eventId', 'title date startTime status');

  if (!pass) throw createError('Pass not found', 404);

  // 4. Check pass status
  if (pass.status === 'used') throw createError('Pass already used', 409);
  if (pass.status === 'cancelled') throw createError('Pass has been cancelled', 400);
  if (pass.status === 'expired') throw createError('Pass has expired', 400);

  // 5. Check event status
  const event = pass.eventId as { status?: string; title?: string; date?: Date };
  if (event?.status === 'cancelled') throw createError('Event has been cancelled', 400);

  // 6. Check booking is confirmed
  const booking = await Booking.findById(pass.bookingId);
  if (!booking || !['confirmed', 'checked_in'].includes(booking.status)) {
    throw createError('Booking is not confirmed', 400);
  }

  // 7. Mark checked in
  await Pass.findByIdAndUpdate(passId, {
    status: 'used',
    checkedInAt: new Date(),
    scannedBy: scannerId,
  });

  await Booking.findByIdAndUpdate(pass.bookingId, { status: 'checked_in' });
  await Event.findByIdAndUpdate(eventId, { $inc: { checkedInCount: 1 } });

  await writeAuditLog({
    actorId: scannerId,
    action: 'QR_SCAN_SUCCESS',
    targetType: 'Pass',
    targetId: passId,
    metadata: { eventId, userId: payload.userId },
  });

  const user = pass.userId as { name?: string; username?: string; profileImage?: string };

  return {
    success: true,
    message: 'Entry Approved',
    guest: {
      name: user?.name,
      username: user?.username,
      profileImage: user?.profileImage,
    },
    event: { title: event?.title, date: event?.date },
    checkedInAt: new Date(),
  };
}
