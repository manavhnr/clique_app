import { z } from 'zod';

export const createReportSchema = z.object({
  targetType: z.enum(['user', 'post', 'event', 'comment', 'host']),
  targetId: z.string().min(1),
  reason: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});
