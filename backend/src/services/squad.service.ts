import { EventSquad } from '../models/EventSquad';
import { Event } from '../models/Event';
import { User } from '../models/User';
import { JoinRequest } from '../models/JoinRequest';
import { Booking } from '../models/Booking';
import { createError } from '../middleware/error.middleware';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function assertRegistered(userId: string, eventId: string) {
  // User must have a pending/approved request OR a confirmed booking to form a squad
  const [request, booking] = await Promise.all([
    JoinRequest.findOne({ userId, eventId, status: { $in: ['requested', 'approved'] } }),
    Booking.findOne({ userId, eventId, status: { $in: ['confirmed', 'checked_in'] } }),
  ]);
  if (!request && !booking) {
    throw createError('You must register for this event before managing a squad', 403);
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createSquad(userId: string, eventId: string, name?: string) {
  await assertRegistered(userId, eventId);

  const existingMembership = await EventSquad.findOne({ eventId, 'members.userId': userId });
  if (existingMembership) throw createError('You are already in a squad for this event', 409);

  const user = await User.findById(userId).select('name username');
  if (!user) throw createError('User not found', 404);

  const squad = await EventSquad.create({
    eventId,
    name: name?.trim() || `${user.username}'s squad`,
    creatorId: userId,
    members: [{ userId, name: user.name, username: user.username, joinedAt: new Date() }],
  });

  return squad;
}

// ─── Read (user) ─────────────────────────────────────────────────────────────

export async function getMySquad(userId: string, eventId: string) {
  const squad = await EventSquad.findOne({ eventId, 'members.userId': userId });

  // Check for a pending invite in any squad for this event
  const pendingInvite = !squad
    ? await EventSquad.findOne({
        eventId,
        invites: { $elemMatch: { userId, status: 'pending' } },
      })
    : null;

  return { squad, pendingInvite };
}

// ─── Read (host) ──────────────────────────────────────────────────────────────

export async function getAllSquadsForEvent(hostId: string, eventId: string) {
  const event = await Event.findById(eventId).select('hostId');
  if (!event) throw createError('Event not found', 404);
  if (event.hostId.toString() !== hostId) throw createError('Forbidden', 403);

  const squads = await EventSquad.find({ eventId }).sort({ createdAt: 1 });
  return { squads };
}

// ─── Invite ───────────────────────────────────────────────────────────────────

export async function inviteToSquad(squadId: string, inviterUserId: string, targetUsername: string) {
  const squad = await EventSquad.findById(squadId);
  if (!squad) throw createError('Squad not found', 404);

  const isMember = squad.members.some((m) => m.userId.toString() === inviterUserId);
  if (!isMember) throw createError('You must be a squad member to invite others', 403);

  const targetUser = await User.findOne({ username: targetUsername }).select('_id name username');
  if (!targetUser) throw createError('User not found', 404);

  const targetId = targetUser._id.toString();

  if (targetId === inviterUserId) throw createError('You cannot invite yourself', 400);

  if (squad.members.some((m) => m.userId.toString() === targetId)) {
    throw createError('@' + targetUsername + ' is already in the squad', 409);
  }

  const alreadyInvited = squad.invites.some(
    (i) => i.userId.toString() === targetId && i.status === 'pending'
  );
  if (alreadyInvited) throw createError('@' + targetUsername + ' already has a pending invite', 409);

  // Can't be in two squads for the same event
  const targetInSquad = await EventSquad.findOne({ eventId: squad.eventId, 'members.userId': targetId });
  if (targetInSquad) throw createError('@' + targetUsername + ' is already in another squad for this event', 409);

  await EventSquad.findByIdAndUpdate(squadId, {
    $push: {
      invites: {
        userId: targetUser._id,
        invitedBy: inviterUserId,
        status: 'pending',
        invitedAt: new Date(),
      },
    },
  });

  return { targetUser };
}

// ─── Respond to invite ────────────────────────────────────────────────────────

export async function respondToInvite(squadId: string, userId: string, accept: boolean) {
  const squad = await EventSquad.findById(squadId);
  if (!squad) throw createError('Squad not found', 404);

  const hasPendingInvite = squad.invites.some(
    (i) => i.userId.toString() === userId && i.status === 'pending'
  );
  if (!hasPendingInvite) throw createError('No pending invite found', 404);

  if (accept) {
    const existingSquad = await EventSquad.findOne({
      eventId: squad.eventId,
      'members.userId': userId,
    });
    if (existingSquad) throw createError('You are already in another squad for this event', 409);

    const user = await User.findById(userId).select('name username');
    if (!user) throw createError('User not found', 404);

    await EventSquad.findByIdAndUpdate(
      squadId,
      {
        $push: { members: { userId, name: user.name, username: user.username, joinedAt: new Date() } },
        $set:  { 'invites.$[inv].status': 'accepted' },
      },
      { arrayFilters: [{ 'inv.userId': userId, 'inv.status': 'pending' }] }
    );
  } else {
    await EventSquad.findByIdAndUpdate(
      squadId,
      { $set: { 'invites.$[inv].status': 'declined' } },
      { arrayFilters: [{ 'inv.userId': userId, 'inv.status': 'pending' }] }
    );
  }

  return { accepted: accept };
}

// ─── Leave / Disband ──────────────────────────────────────────────────────────

export async function leaveSquad(squadId: string, userId: string) {
  const squad = await EventSquad.findById(squadId);
  if (!squad) throw createError('Squad not found', 404);

  const isMember = squad.members.some((m) => m.userId.toString() === userId);
  if (!isMember) throw createError('You are not in this squad', 403);

  // Creator leaves → disband the whole squad
  if (squad.creatorId.toString() === userId) {
    await EventSquad.findByIdAndDelete(squadId);
    return { disbanded: true };
  }

  await EventSquad.findByIdAndUpdate(squadId, {
    $pull: { members: { userId } },
  });

  return { disbanded: false };
}
