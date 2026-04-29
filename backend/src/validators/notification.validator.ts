import { z } from 'zod';

export const registerTokenSchema = z.object({
  fcmToken: z.string().min(1),
  platform: z.enum(['ios', 'android']).optional(),
});
