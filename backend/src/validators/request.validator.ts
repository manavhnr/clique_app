import { z } from 'zod';

export const createRequestSchema = z.object({
  eventId: z.string().min(1),
  message: z.string().max(500).optional(),
});

export const rejectRequestSchema = z.object({
  rejectionReason: z.string().max(500).optional(),
});
