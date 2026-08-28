import { z } from 'zod';

export const createBookingSchema = z.object({
  eventId: z.string().min(1),
  groupPricingIndex: z.number().int().min(0).optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});
