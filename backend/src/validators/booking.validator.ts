import { z } from 'zod';

export const createBookingSchema = z.object({
  eventId: z.string().min(1),
  tierLabel: z.string().optional(),
  groupPricingIndex: z.number().int().min(0).optional(),
  ticketTypeIndex: z.number().int().min(0).optional(),
  ticketSelections: z.array(
    z.object({
      ticketTypeIndex: z.number().int().min(0),
      quantity: z.number().int().min(1),
    })
  ).optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});
