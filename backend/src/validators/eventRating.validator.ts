import { z } from 'zod';

export const createEventRatingSchema = z.object({
  eventId: z.string().min(1),
  targetUserId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
});
