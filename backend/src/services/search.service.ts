import { Event } from '../models/Event';
import { User } from '../models/User';
import { SavedEvent } from '../models/SavedEvent';
import { escapeRegex } from '../utils/regex';

const RESULT_LIMIT = 20;

// ─── Near Me (city-based) ─────────────────────────────────────────────────────

export interface NearMeFilters {
  date?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'trending' | 'date';
  page?: number;
  limit?: number;
}

export async function getEventsNearMe(filters: NearMeFilters, requesterId: string) {
  const { date, category, minPrice, maxPrice, sort = 'date', page = 1, limit = 20 } = filters;

  const user = await User.findById(requesterId).select('city').lean();
  const city = (user?.city ?? '').trim();

  const query: Record<string, unknown> = {
    status: 'published',
    date: { $gte: new Date() },
    privacy: { $ne: 'secret' },
  };

  if (city) {
    const cityRegex = new RegExp(escapeRegex(city), 'i');
    query.$or = [{ locationName: cityRegex }, { address: cityRegex }];
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

  type SortOption = { likeCount?: -1; viewCount?: -1; date?: 1; isFeatured?: -1 };
  const sortOption: SortOption = sort === 'trending'
    ? { isFeatured: -1, likeCount: -1, viewCount: -1 }
    : { isFeatured: -1, date: 1 };

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

  return {
    events: events.map((e) => ({
      ...e.toObject(),
      saved: savedSet.has(e._id.toString()),
      availableSlots: e.capacity - e.bookedCount,
    })),
    city: city || null,
  };
}

// ─── Event Search ────────────────────────────────────────────────────────────

export interface EventSearchFilters {
  q?: string;
  date?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export async function searchEvents(filters: EventSearchFilters, requesterId: string) {
  const { q, date, category, minPrice, maxPrice, page = 1, limit = 20 } = filters;

  const requester = await User.findById(requesterId).select('unlockedSecretEvents').lean();
  const unlockedIds = requester?.unlockedSecretEvents ?? [];

  const query: Record<string, unknown> = {
    status: 'published',
    date: { $gte: new Date() },
    $or: [{ privacy: { $ne: 'secret' } }, { _id: { $in: unlockedIds } }],
  };

  if (q) {
    query.$text = { $search: q };
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

  const events = await Event.find(query, q ? { score: { $meta: 'textScore' } } : {})
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

  const regex = new RegExp(escapeRegex(q.trim()), 'i');

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
      privacy: { $ne: 'secret' },
      $or: [{ title: regex }, { description: regex }, { locationName: regex }, { vibeTags: regex }],
    })
      .select('title images date startTime locationName price hostId privacy category')
      .populate('hostId', 'name username profileImage')
      .sort({ date: 1 })
      .limit(RESULT_LIMIT),
  ]);

  return { users, hosts, events };
}
