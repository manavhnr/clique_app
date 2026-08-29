import mongoose from 'mongoose';
import { Event, IEvent } from '../models/Event';
import { SavedEvent } from '../models/SavedEvent';
import { Booking } from '../models/Booking';
import { Pass } from '../models/Pass';
import { JoinRequest } from '../models/JoinRequest';
import { User } from '../models/User';
import { createError } from '../middleware/error.middleware';
import { writeAuditLog } from '../utils/auditLog';
import { incrementEventCreationScore } from './cliquescore.service';
import { notifyEventCancelled } from './notification.service';
import { uploadFile } from '../utils/cloudinary';
import { z } from 'zod';
import { createEventSchema, updateEventSchema, addTierSchema } from '../validators/event.validator';

type CreateEventInput = z.infer<typeof createEventSchema>;
type UpdateEventInput = z.infer<typeof updateEventSchema>;
type AddTierInput = z.infer<typeof addTierSchema>;

export async function createEvent(
  hostId: string,
  data: CreateEventInput,
  imageFiles: Express.Multer.File[],
  videoFiles: Express.Multer.File[] = []
) {
  const [images, videos] = await Promise.all([
    Promise.all(imageFiles.map((f) => uploadFile(f, 'clique/events/images'))),
    Promise.all(videoFiles.map((f) => uploadFile(f, 'clique/events/videos'))),
  ]);

  const event = await Event.create({
    hostId,
    title: data.title,
    description: data.description,
    images,
    videos,
    category: data.category,
    vibeTags: data.vibeTags,
    musicTags: data.musicTags,
    rules: data.rules,
    date: new Date(data.date),
    startTime: data.startTime,
    endTime: data.endTime,
    locationName: data.locationName,
    address: data.address,
    locationLink: data.locationLink,
    exactAddressHiddenBeforeBooking: data.exactAddressHiddenBeforeBooking,
    price: data.price,
    platformFee: data.platformFee,
    pricingMode: data.pricingData?.mode ?? 'common',
    pricingTiers: data.pricingData?.tiers ?? [],
    groupPricing: data.pricingData?.groups ?? [],
    capacity: data.capacity,
    privacy: data.privacy,
    approvalRequired: data.approvalRequired,
    requiresSocials: data.requiresSocials,
    requiredSocials: data.requiredSocials,
    ageLimit: data.ageLimit,
    refundPolicy: data.refundPolicy,
    status: data.status,
  });

  if (data.status === 'published') {
    await incrementEventCreationScore(hostId);
    await writeAuditLog({ actorId: hostId, action: 'EVENT_PUBLISHED', targetType: 'Event', targetId: event._id.toString() });
  }

  return event;
}

export async function getEventById(eventId: string, requesterId: string) {
  const event = await Event.findById(eventId)
    .populate('hostId', 'name username profileImage isVerifiedHost followerCount');

  if (!event || event.status === 'blocked') throw createError('Event not found', 404);

  // Fetch the requester's relationship to this event in parallel
  const [saved, userRequest, userBooking] = await Promise.all([
    SavedEvent.findOne({ userId: requesterId, eventId }),
    JoinRequest.findOne({ userId: requesterId, eventId }).select('status rejectionReason createdAt'),
    Booking.findOne({
      userId: requesterId,
      eventId,
      status: { $nin: ['cancelled', 'refunded', 'rejected'] },
    }),
  ]);

  // Hide exact address for private events until the user has a confirmed booking
  let address = event.address;
  if (event.exactAddressHiddenBeforeBooking) {
    const hasConfirmed = userBooking && ['confirmed', 'checked_in'].includes(userBooking.status);
    if (!hasConfirmed) address = 'Address revealed after booking';
  }

  // Fire-and-forget view increment — never block or fail the read on it
  void Event.findByIdAndUpdate(eventId, { $inc: { viewCount: 1 } }).catch(() => {});

  // If this is a secret event, record that the requester has unlocked it
  if (event.privacy === 'secret') {
    void User.findByIdAndUpdate(requesterId, { $addToSet: { unlockedSecretEvents: eventId } }).catch(() => {});
  }

  const activeTier = event.pricingTiers?.find(
    (t) => t.isOpen && (!t.capacity || t.soldCount < t.capacity)
  ) ?? null;

  return {
    event: {
      ...event.toObject(),
      address,
      saved: !!saved,
      userBooking: userBooking || null,
      userRequest: userRequest || null,
      activeTier,
    },
  };
}

export async function updateEvent(
  eventId: string,
  hostId: string,
  data: UpdateEventInput,
  imageFiles: Express.Multer.File[] = [],
  videoFiles: Express.Multer.File[] = []
) {
  const event = await Event.findById(eventId);
  if (!event) throw createError('Event not found', 404);
  if (event.hostId.toString() !== hostId) throw createError('Forbidden', 403);
  if (event.status === 'cancelled' || event.status === 'completed') {
    throw createError('Cannot update a cancelled or completed event', 400);
  }

  const update: Record<string, unknown> = { ...data };
  if (data.date) update.date = new Date(data.date);
  if (data.pricingData) {
    update.pricingMode = data.pricingData.mode;
    // Preserve soldCount and isOpen from existing tiers when label matches
    update.pricingTiers = data.pricingData.tiers.map((incoming) => {
      const existing = event.pricingTiers.find((t) => t.label === incoming.label);
      return {
        ...incoming,
        soldCount: existing?.soldCount ?? 0,
        isOpen: existing?.isOpen ?? true,
      };
    });
    update.groupPricing = data.pricingData.groups;
  }
  delete update.pricingData;

  // Append any newly uploaded media to existing arrays
  if (imageFiles.length > 0) {
    const newImageUrls = await Promise.all(imageFiles.map((f) => uploadFile(f, 'clique/events/images')));
    update.images = [...event.images, ...newImageUrls];
  }
  if (videoFiles.length > 0) {
    const newVideoUrls = await Promise.all(videoFiles.map((f) => uploadFile(f, 'clique/events/videos')));
    update.videos = [...event.videos, ...newVideoUrls];
  }

  const updated = await Event.findByIdAndUpdate(eventId, { $set: update }, { new: true, runValidators: true });
  return updated;
}

export async function publishEvent(eventId: string, hostId: string) {
  const event = await Event.findById(eventId);
  if (!event) throw createError('Event not found', 404);
  if (event.hostId.toString() !== hostId) throw createError('Forbidden', 403);
  if (event.status !== 'draft') throw createError('Only draft events can be published', 400);

  await Event.findByIdAndUpdate(eventId, { status: 'published' });
  await incrementEventCreationScore(hostId);
  await writeAuditLog({ actorId: hostId, action: 'EVENT_PUBLISHED', targetType: 'Event', targetId: eventId });
}

export async function cancelEvent(eventId: string, hostId: string, role: string) {
  const event = await Event.findById(eventId);
  if (!event) throw createError('Event not found', 404);

  const isHost = event.hostId.toString() === hostId;
  const isAdmin = role === 'admin';
  if (!isHost && !isAdmin) throw createError('Forbidden', 403);
  if (event.status === 'cancelled') throw createError('Event already cancelled', 409);

  await Event.findByIdAndUpdate(eventId, { status: 'cancelled' });

  // Invalidate all active passes for this event
  await Pass.updateMany({ eventId, status: 'active' }, { status: 'cancelled' });

  // Notify all confirmed attendees
  const affectedBookings = await Booking.find({
    eventId,
    status: { $in: ['confirmed', 'checked_in'] },
  }).select('userId');
  affectedBookings.forEach((b) => void notifyEventCancelled(b.userId.toString(), event.title));

  await writeAuditLog({ actorId: hostId, action: 'EVENT_CANCELLED', targetType: 'Event', targetId: eventId });
}

export async function deleteEvent(eventId: string, hostId: string) {
  const event = await Event.findById(eventId);
  if (!event) throw createError('Event not found', 404);
  if (event.hostId.toString() !== hostId) throw createError('Forbidden', 403);
  if (event.status !== 'draft') throw createError('Only draft events can be deleted', 400);

  await Event.findByIdAndDelete(eventId);
}

export async function saveEvent(userId: string, eventId: string) {
  const event = await Event.findById(eventId);
  if (!event || event.status !== 'published') throw createError('Event not found', 404);

  await SavedEvent.create({ userId, eventId });
  await Event.findByIdAndUpdate(eventId, { $inc: { saveCount: 1 } });
}

export async function unsaveEvent(userId: string, eventId: string) {
  const result = await SavedEvent.findOneAndDelete({ userId, eventId });
  if (!result) throw createError('Event not saved', 404);
  await Event.findByIdAndUpdate(eventId, { $inc: { saveCount: -1 } });
}

export async function getHostEvents(hostId: string, page: number, limit: number) {
  const events = await Event.find({ hostId, status: { $ne: 'blocked' } })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .select('title images date startTime status capacity bookedCount checkedInCount privacy price');

  const total = await Event.countDocuments({ hostId, status: { $ne: 'blocked' } });
  return { events, total, page, limit };
}

export async function getPublicEvents(startDate?: Date, endDate?: Date, limit = 20) {
  const from = startDate ?? new Date();
  const to   = endDate   ?? (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d; })();

  const events = await Event.find({ status: 'published', date: { $gte: from, $lte: to } })
    .sort({ date: 1, isFeatured: -1 })
    .limit(limit)
    .select('title category vibeTags date startTime endTime capacity bookedCount images price locationName privacy')
    .lean();

  // Attach Mon-based dayOfWeek (0=Mon … 6=Sun) so the frontend can position events on the week axis
  return events.map((e) => ({
    ...e,
    dayOfWeek: (new Date(e.date).getDay() + 6) % 7,
  }));
}

export async function getEventsFeed(page: number, limit: number, requesterId: string) {
  const events = await Event.find({ status: 'published', date: { $gte: new Date() } })
    .sort({ isFeatured: -1, date: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('hostId', 'name username profileImage isVerifiedHost');

  const savedEvents = await SavedEvent.find({
    userId: requesterId,
    eventId: { $in: events.map((e) => e._id) },
  }).select('eventId');
  const savedSet = new Set(savedEvents.map((s) => s.eventId.toString()));

  return events.map((e) => ({ ...e.toObject(), saved: savedSet.has(e._id.toString()) }));
}

export async function addCoHost(eventId: string, requesterId: string, username: string) {
  const event = await Event.findById(eventId);
  if (!event) throw createError('Event not found', 404);
  if (event.hostId.toString() !== requesterId) throw createError('Not your event', 403);

  const target = await User.findOne({ username });
  if (!target) throw createError('User not found', 404);
  if (target._id.toString() === requesterId) throw createError('Cannot add yourself as co-host', 400);

  const alreadyAdded = event.coHosts.some((c) => c.userId.toString() === target._id.toString());
  if (alreadyAdded) throw createError('User is already a co-host', 409);

  event.coHosts.push({ userId: target._id as mongoose.Types.ObjectId, username: target.username, addedAt: new Date() });
  await event.save();
  return event;
}

export async function removeCoHost(eventId: string, requesterId: string, targetUserId: string) {
  const event = await Event.findById(eventId);
  if (!event) throw createError('Event not found', 404);
  if (event.hostId.toString() !== requesterId) throw createError('Not your event', 403);

  event.coHosts = event.coHosts.filter((c) => c.userId.toString() !== targetUserId) as typeof event.coHosts;
  await event.save();
  return event;
}

export async function addScanner(eventId: string, requesterId: string, username: string) {
  const event = await Event.findById(eventId);
  if (!event) throw createError('Event not found', 404);
  if (event.hostId.toString() !== requesterId) throw createError('Not your event', 403);

  const target = await User.findOne({ username });
  if (!target) throw createError('User not found', 404);

  const alreadyAdded = event.scanners.some((s) => s.userId.toString() === target._id.toString());
  if (alreadyAdded) throw createError('User already has scanner permission', 409);

  event.scanners.push({ userId: target._id as mongoose.Types.ObjectId, username: target.username, addedAt: new Date() });
  await event.save();
  return event;
}

export async function removeScanner(eventId: string, requesterId: string, targetUserId: string) {
  const event = await Event.findById(eventId);
  if (!event) throw createError('Event not found', 404);
  if (event.hostId.toString() !== requesterId) throw createError('Not your event', 403);

  event.scanners = event.scanners.filter((s) => s.userId.toString() !== targetUserId) as typeof event.scanners;
  await event.save();
  return event;
}

// ─── Ticket Phases ────────────────────────────────────────────────────────────

export async function addTier(eventId: string, hostId: string, data: AddTierInput) {
  const event = await Event.findById(eventId);
  if (!event) throw createError('Event not found', 404);
  if (event.hostId.toString() !== hostId) throw createError('Forbidden', 403);
  if (['cancelled', 'completed', 'blocked'].includes(event.status)) {
    throw createError('Cannot add a phase to this event', 400);
  }

  event.pricingTiers.push({
    label: data.label,
    commonPrice: data.commonPrice,
    malePrice: data.malePrice ?? 0,
    femalePrice: data.femalePrice ?? 0,
    capacity: data.capacity,
    soldCount: 0,
    isOpen: true,
  } as typeof event.pricingTiers[number]);
  await event.save();
  return event;
}

export async function setTierOpen(eventId: string, hostId: string, tierId: string, isOpen: boolean) {
  const event = await Event.findById(eventId);
  if (!event) throw createError('Event not found', 404);
  if (event.hostId.toString() !== hostId) throw createError('Forbidden', 403);

  const tier = event.pricingTiers.find((t) => t._id?.toString() === tierId);
  if (!tier) throw createError('Phase not found', 404);

  tier.isOpen = isOpen;
  await event.save();
  return event;
}
