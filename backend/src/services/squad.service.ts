import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { EventSquad } from '../models/EventSquad';
import { Event } from '../models/Event';
import { User } from '../models/User';
import { JoinRequest } from '../models/JoinRequest';
import { Booking } from '../models/Booking';
import { Pass } from '../models/Pass';
import { createError } from '../middleware/error.middleware';
import { generatePass } from './booking.service';

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

  // Enrich each squad with full member user details + their request status
  const enriched = await Promise.all(
    squads.map(async (sq) => {
      const memberUserIds = sq.members.map((m) => m.userId);

      const [users, requests, groupPass] = await Promise.all([
        User.find({ _id: { $in: memberUserIds } }).select(
          'name username profileImage gender phone connectedSocials city cliquescore age'
        ),
        JoinRequest.find({ eventId, userId: { $in: memberUserIds } }).select(
          '_id userId status createdAt'
        ),
        Pass.findOne({ groupId: sq._id.toString(), passType: 'group' }).select('_id status'),
      ]);

      const userMap  = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
      const reqMap   = Object.fromEntries(requests.map((r) => [r.userId.toString(), r]));

      const membersEnriched = sq.members.map((m) => {
        const uid  = m.userId.toString();
        const user = userMap[uid];
        const req  = reqMap[uid];
        return {
          userId:   uid,
          name:     user?.name       ?? m.name,
          username: user?.username   ?? m.username,
          profileImage: user?.profileImage,
          gender:   user?.gender,
          age:      user?.age,
          phone:    user?.phone,
          connectedSocials: user?.connectedSocials,
          city:     user?.city,
          cliquescore: user?.cliquescore,
          requestId:     req?._id?.toString() ?? null,
          requestStatus: req?.status ?? null,
          joinedAt: m.joinedAt,
        };
      });

      const allApproved = membersEnriched.every(
        (m) => m.requestStatus === 'approved' || m.requestStatus === null
      );
      const anyPending  = membersEnriched.some((m) => m.requestStatus === 'requested');

      return {
        _id:         sq._id,
        name:        sq.name,
        creatorId:   sq.creatorId,
        eventId:     sq.eventId,
        members:     membersEnriched,
        groupStatus: allApproved ? 'approved' : anyPending ? 'pending' : 'mixed',
        groupPass:   groupPass ? { _id: groupPass._id, status: groupPass.status } : null,
        createdAt:   sq.createdAt,
      };
    })
  );

  return { squads: enriched };
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

// ─── Host: Approve Entire Group ───────────────────────────────────────────────

export async function approveGroup(squadId: string, hostId: string) {
  const squad = await EventSquad.findById(squadId);
  if (!squad) throw createError('Group not found', 404);

  const event = await Event.findById(squad.eventId).select('hostId title status capacity bookedCount');
  if (!event) throw createError('Event not found', 404);
  if (event.hostId.toString() !== hostId) throw createError('Forbidden', 403);
  if (event.status !== 'published') throw createError('Event is not active', 400);

  const memberIds = squad.members.map((m) => m.userId.toString());
  if (memberIds.length === 0) throw createError('Group has no members', 400);

  // Check capacity — need slots for all members not yet confirmed
  const alreadyBooked = await Booking.countDocuments({
    eventId: squad.eventId,
    userId: { $in: squad.members.map((m) => m.userId) },
    status: { $in: ['confirmed', 'checked_in'] },
  });
  const needed = memberIds.length - alreadyBooked;
  if (needed > 0) {
    // Atomic capacity check and increment
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: squad.eventId,
        status: 'published',
        $expr: { $lte: [{ $add: ['$bookedCount', needed] }, '$capacity'] },
      },
      { $inc: { bookedCount: needed } },
      { new: true }
    );
    if (!updatedEvent) throw createError('Not enough capacity for all group members', 400);
  }

  // For each member: approve their pending JoinRequest, create booking + individual pass
  const results: { userId: string; bookingId: string; passId: string }[] = [];
  let creatorBookingId = '';

  for (const member of squad.members) {
    const userId = member.userId.toString();

    // Approve pending join request if it exists
    await JoinRequest.findOneAndUpdate(
      { userId: member.userId, eventId: squad.eventId, status: 'requested' },
      { status: 'approved' }
    );

    // Skip if already has a confirmed booking
    const existingBooking = await Booking.findOne({
      userId: member.userId,
      eventId: squad.eventId,
      status: { $in: ['confirmed', 'checked_in'] },
    });

    let booking;
    if (existingBooking) {
      booking = existingBooking;
    } else {
      booking = await Booking.create({
        userId:  member.userId,
        eventId: squad.eventId,
        hostId,
        status:  'confirmed',
        amount:  0,
      });
    }

    // Generate individual pass if not already present
    const existingPass = await Pass.findOne({ userId: member.userId, eventId: squad.eventId, passType: { $in: ['individual', null] } });
    if (!existingPass) {
      const pass = await generatePass(booking._id.toString(), userId, squad.eventId.toString());
      await Booking.findByIdAndUpdate(booking._id, { passId: pass._id });
      results.push({ userId, bookingId: booking._id.toString(), passId: pass._id.toString() });
    } else {
      results.push({ userId, bookingId: booking._id.toString(), passId: existingPass._id.toString() });
    }

    if (userId === squad.creatorId.toString()) {
      creatorBookingId = booking._id.toString();
    }
  }

  // If no creatorBookingId found (creator not a member — shouldn't happen), use first member's
  if (!creatorBookingId && results.length > 0) {
    creatorBookingId = results[0].bookingId;
  }

  // Generate ONE group pass for the creator (covers all members)
  const existingGroupPass = await Pass.findOne({ groupId: squadId, passType: 'group' });
  let groupPass;
  if (existingGroupPass) {
    groupPass = existingGroupPass;
  } else {
    groupPass = await generateGroupPass(
      creatorBookingId,
      squad.creatorId.toString(),
      squad.eventId.toString(),
      squadId,
      memberIds
    );
  }

  return { squad, individualPasses: results, groupPass };
}

async function generateGroupPass(
  bookingId: string,
  creatorId: string,
  eventId: string,
  squadId: string,
  memberIds: string[]
) {
  // Temp hash placeholder
  const tempHash = crypto.randomBytes(16).toString('hex');
  const pass = await Pass.create({
    bookingId,
    userId:   creatorId,
    eventId,
    passType: 'group',
    groupId:  squadId,
    memberIds,
    qrTokenHash: tempHash,
    status: 'active',
  });

  const qrPayload = jwt.sign(
    { passId: pass._id.toString(), eventId, userId: creatorId },
    process.env.JWT_SECRET as string,
    { expiresIn: '365d' }
  );

  const qrTokenHash = crypto.createHash('sha256').update(qrPayload).digest('hex');
  const qrCodeUrl   = await QRCode.toDataURL(qrPayload);

  await Pass.findByIdAndUpdate(pass._id, { qrTokenHash, qrCodeUrl });
  return { ...pass.toObject(), qrCodeUrl };
}
