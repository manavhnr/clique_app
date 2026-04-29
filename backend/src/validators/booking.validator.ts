import { z } from 'zod';

export const createBookingSchema = z.object({
  eventId: z.string().min(1),
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});
