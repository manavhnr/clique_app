import { EventRating } from '../models/EventRating';
import { Booking } from '../models/Booking';
import { User } from '../models/User';
import { createError } from '../middleware/error.middleware';

export async function rateEvent(
  raterId: string,
  eventId: string,
  targetUserId: string,
  rating: number
) {
  // Only users who attended the event can rate
  const attended = await Booking.findOne({
    userId: raterId,
    eventId,
    status: { $in: ['confirmed', 'checked_in'] },
  });
  if (!attended) throw createError('You can only rate events you attended', 403);

  const eventRating = await EventRating.create({ raterId, eventId, targetUserId, rating });

  // Update host's average rating on the User model
  const allRatings = await EventRating.find({ targetUserId });
  const avg = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
  await User.findByIdAndUpdate(targetUserId, { averageRating: Math.round(avg * 10) / 10 });

  return eventRating;
}

export async function getEventRatings(eventId: string, page: number, limit: number) {
  const ratings = await EventRating.find({ eventId })
    .populate('raterId', 'name username profileImage')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await EventRating.countDocuments({ eventId });
  return { ratings, total, page, limit };
}
