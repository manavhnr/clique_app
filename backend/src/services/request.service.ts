import { JoinRequest } from '../models/JoinRequest';
import { Event } from '../models/Event';
import { createError } from '../middleware/error.middleware';
import { writeAuditLog } from '../utils/auditLog';
import { notifyRequestApproved, notifyRequestRejected } from './notification.service';

export async function requestAccess(userId: string, eventId: string, message?: string) {
  const event = await Event.findById(eventId);
  if (!event || event.status !== 'published') throw createError('Event not found', 404);
  if (event.privacy !== 'private') throw createError('This event does not require a request', 400);
  if (event.hostId.toString() === userId) throw createError('Host cannot request access to own event', 400);

  const existing = await JoinRequest.findOne({ userId, eventId });
  if (existing) {
    if (existing.status === 'approved') throw createError('Already approved for this event', 409);
    if (existing.status === 'requested') throw createError('Request already pending', 409);
    // Allow re-request if previously rejected/expired
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
  limit: number
) {
  const query: Record<string, unknown> = { hostId, status: 'requested' };
  if (eventId) query.eventId = eventId;

  const requests = await JoinRequest.find(query)
    .populate('userId', 'name username profileImage cliquescore city')
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

  const event = await Event.findById(request.eventId);
  if (!event || event.status !== 'published') throw createError('Event no longer available', 400);
  if (event.bookedCount >= event.capacity) throw createError('Event is at full capacity', 400);

  await JoinRequest.findByIdAndUpdate(requestId, { status: 'approved' });
  void notifyRequestApproved(request.userId.toString(), event.title);

  await writeAuditLog({
    actorId: hostId,
    action: 'JOIN_REQUEST_APPROVED',
    targetType: 'JoinRequest',
    targetId: requestId,
  });

  return request;
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
