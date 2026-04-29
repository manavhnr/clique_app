import { Event } from '../models/Event';
import { User } from '../models/User';
import { SavedEvent } from '../models/SavedEvent';

const RESULT_LIMIT = 20;

// ─── Near Me ────────────────────────────────────────────────────────────────

export interface NearMeFilters {
  latitude: number;
  longitude: number;
  radius?: number;       // metres, default 10km
  date?: string;         // ISO date — filter by day
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'distance' | 'trending' | 'date';
  page?: number;
  limit?: number;
}

export async function getEventsNearMe(filters: NearMeFilters, requesterId: string) {
  const {
    latitude,
    longitude,
    radius = 10000,
    date,
    category,
    minPrice,
    maxPrice,
    sort = 'distance',
    page = 1,
    limit = 20,
  } = filters;

  const query: Record<string, unknown> = {
    status: 'published',
    date: { $gte: new Date() },
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: radius,
      },
    },
  };

  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    query.date = { $gte: start, $lt: end };
  }

  if (category) query.category = category;
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {
      ...(minPrice !== undefined ? { $gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { $lte: maxPrice } : {}),
    };
  }

  type SortOption = { likeCount?: -1; viewCount?: -1; date?: 1 };
  let sortOption: SortOption = {};
  if (sort === 'trending') sortOption = { likeCount: -1, viewCount: -1 };
  else if (sort === 'date') sortOption = { date: 1 };

  const events = await Event.find(query)
    .sort(sortOption)
    .skip((page - 1) * limit)
    .limit(Math.min(limit, 50))
    .select('title images date startTime locationName address price capacity bookedCount privacy category vibeTags hostId isFeatured')
    .populate('hostId', 'name username profileImage isVerifiedHost');

  const savedEvents = await SavedEvent.find({
    userId: requesterId,
    eventId: { $in: events.map((e) => e._id) },
  }).select('eventId');
  const savedSet = new Set(savedEvents.map((s) => s.eventId.toString()));

  return events.map((e) => ({
    ...e.toObject(),
    saved: savedSet.has(e._id.toString()),
    availableSlots: e.capacity - e.bookedCount,
  }));
}

// ─── Event Search ────────────────────────────────────────────────────────────

export interface EventSearchFilters {
  q?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  date?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export async function searchEvents(filters: EventSearchFilters, requesterId: string) {
  const { q, latitude, longitude, radius = 10000, date, category, minPrice, maxPrice, page = 1, limit = 20 } = filters;

  const query: Record<string, unknown> = { status: 'published', date: { $gte: new Date() } };

  if (q) {
    query.$text = { $search: q };
  }

  if (latitude !== undefined && longitude !== undefined) {
    query.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: radius,
      },
    };
  }

  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    query.date = { $gte: start, $lt: end };
  }

  if (category) query.category = category;

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {
      ...(minPrice !== undefined ? { $gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { $lte: maxPrice } : {}),
    };
  }

  const events = await Event.find(query)
    .sort(q ? { score: { $meta: 'textScore' } } : { date: 1 })
    .skip((page - 1) * limit)
    .limit(Math.min(limit, 50))
    .select('title images date startTime locationName price capacity bookedCount privacy category vibeTags hostId')
    .populate('hostId', 'name username profileImage isVerifiedHost');

  const savedEvents = await SavedEvent.find({
    userId: requesterId,
    eventId: { $in: events.map((e) => e._id) },
  }).select('eventId');
  const savedSet = new Set(savedEvents.map((s) => s.eventId.toString()));

  return events.map((e) => ({
    ...e.toObject(),
    saved: savedSet.has(e._id.toString()),
    availableSlots: e.capacity - e.bookedCount,
  }));
}

// ─── Global Search ───────────────────────────────────────────────────────────

export async function globalSearch(q: string, requesterId: string) {
  if (!q || q.trim().length < 2) return { users: [], hosts: [], events: [] };

  const regex = new RegExp(q.trim(), 'i');

  const [users, hosts, events] = await Promise.all([
    // Users
    User.find({
      isBanned: false,
      isVerifiedHost: false,
      role: 'attendee',
      $or: [{ username: regex }, { name: regex }, { bio: regex }, { city: regex }],
    })
      .select('name username profileImage bio cliquescore followerCount city')
      .sort({ cliquescore: -1 })
      .limit(RESULT_LIMIT),

    // Hosts
    User.find({
      isBanned: false,
      isVerifiedHost: true,
      $or: [{ username: regex }, { name: regex }, { bio: regex }, { city: regex }],
    })
      .select('name username profileImage bio cliquescore followerCount city isVerifiedHost')
      .sort({ cliquescore: -1 })
      .limit(RESULT_LIMIT),

    // Events
    Event.find({
      status: 'published',
      $or: [{ title: regex }, { description: regex }, { locationName: regex }, { vibeTags: regex }],
    })
      .select('title images date startTime locationName price hostId privacy category')
      .populate('hostId', 'name username profileImage')
      .sort({ date: 1 })
      .limit(RESULT_LIMIT),
  ]);

  return { users, hosts, events };
}
