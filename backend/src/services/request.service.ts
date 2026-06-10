import { JoinRequest } from '../models/JoinRequest';
import { Event } from '../models/Event';
import { User } from '../models/User';
import { Booking } from '../models/Booking';
import { generatePass } from './booking.service';
import { createError } from '../middleware/error.middleware';
import { writeAuditLog } from '../utils/auditLog';
import { notifyRequestApproved, notifyRequestRejected } from './notification.service';
import { incrementEventAttendance } from './cliquescore.service';

export async function requestAccess(userId: string, eventId: string, message?: string) {
  const event = await Event.findById(eventId);
  if (!event || event.status !== 'published') throw createError('Event not found', 404);
  if (event.hostId.toString() === userId) throw createError('Host cannot register for their own event', 400);

  // ── Social gate ────────────────────────────────────────────────────────────
  if (event.requiresSocials && event.requiredSocials.length > 0) {
    const user = await User.findById(userId).select('connectedSocials');
    const socials = user?.connectedSocials as Record<string, string | undefined> | undefined;
    const missing = event.requiredSocials.filter((s) => !socials?.[s]);
    if (missing.length > 0) {
      throw createError(
        `This event requires a connected ${missing.join(' and ')} account. Add it in your profile.`,
        403
      );
    }
  }

  // ── Duplicate check ───────────────────────────────────────────────────────
  const existing = await JoinRequest.findOne({ userId, eventId });
  if (existing) {
    if (existing.status === 'approved') throw createError('Already approved for this event', 409);
    if (existing.status === 'requested') throw createError('Registration already pending', 409);
    // Allow re-request after rejection
    await JoinRequest.findByIdAndUpdate(existing._id, {
      status: 'requested',
      message,
      rejectionReason: undefined,
    });
    return JoinRequest.findById(existing._id);
  }

  const request = await JoinRequest.create({
    userId,
    eventId,
    hostId: event.hostId,
    message,
    status: 'requested',
  });

  return request;
}

export async function getHostRequests(
  hostId: string,
  eventId: string | undefined,
  page: number,
  limit: number,
  status?: string
) {
  const query: Record<string, unknown> = { hostId };
  if (status && status !== 'all') query.status = status;
  else if (!status) query.status = 'requested';
  if (eventId) query.eventId = eventId;

  const requests = await JoinRequest.find(query)
    .populate('userId', 'name username profileImage gender age phone cliquescore city connectedSocials')
    .populate('eventId', 'title date')
    .sort({ createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await JoinRequest.countDocuments(query);
  return { requests, total, page, limit };
}

export async function approveRequest(requestId: string, hostId: string) {
  const request = await JoinRequest.findById(requestId);
  if (!request) throw createError('Request not found', 404);
  if (request.hostId.toString() !== hostId) throw createError('Forbidden', 403);
  if (request.status !== 'requested') throw createError('Request is not pending', 400);

  // Atomic capacity check
  const event = await Event.findOneAndUpdate(
    { _id: request.eventId, status: 'published', $expr: { $lt: ['$bookedCount', '$capacity'] } },
    { $inc: { bookedCount: 1 } },
    { new: true }
  );
  if (!event) throw createError('Event is full or no longer available', 400);

  await JoinRequest.findByIdAndUpdate(requestId, { status: 'approved' });

  // Auto-create confirmed booking + pass (no payment on web)
  const booking = await Booking.create({
    userId:  request.userId,
    eventId: request.eventId,
    hostId,
    status:  'confirmed',
    amount:  0,
  });

  const pass = await generatePass(
    booking._id.toString(),
    request.userId.toString(),
    request.eventId.toString()
  );
  await Booking.findByIdAndUpdate(booking._id, { passId: pass._id });

  void incrementEventAttendance(request.userId.toString());
  void notifyRequestApproved(request.userId.toString(), event.title);

  await writeAuditLog({
    actorId: hostId,
    action: 'JOIN_REQUEST_APPROVED',
    targetType: 'JoinRequest',
    targetId: requestId,
    metadata: { bookingId: booking._id.toString() },
  });

  return { request, booking, pass };
}

export async function rejectRequest(requestId: string, hostId: string, rejectionReason?: string) {
  const request = await JoinRequest.findById(requestId);
  if (!request) throw createError('Request not found', 404);
  if (request.hostId.toString() !== hostId) throw createError('Forbidden', 403);
  if (request.status !== 'requested') throw createError('Request is not pending', 400);

  const event = await Event.findById(request.eventId).select('title');
  await JoinRequest.findByIdAndUpdate(requestId, { status: 'rejected', rejectionReason });
  void notifyRequestRejected(request.userId.toString(), event?.title || 'the event');

  await writeAuditLog({
    actorId: hostId,
    action: 'JOIN_REQUEST_REJECTED',
    targetType: 'JoinRequest',
    targetId: requestId,
    metadata: { rejectionReason },
  });
}

export async function getRequestStatus(userId: string, eventId: string) {
  const request = await JoinRequest.findOne({ userId, eventId }).select('status rejectionReason createdAt');
  return { request, hasAccess: request?.status === 'approved' };
}
