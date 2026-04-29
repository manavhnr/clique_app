import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(3000),
  category: z.enum(['house_party', 'club', 'college', 'private', 'concert', 'other']),
  vibeTags: z.array(z.string().max(50)).max(10).default([]),
  musicTags: z.array(z.string().max(50)).max(10).default([]),
  rules: z.string().max(1000).optional(),
  date: z.string().datetime(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  locationName: z.string().min(2).max(300),
  address: z.string().min(5).max(500),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  exactAddressHiddenBeforeBooking: z.coerce.boolean().default(false),
  price: z.coerce.number().min(0),
  platformFee: z.coerce.number().min(0).default(0),
  capacity: z.coerce.number().int().min(1),
  privacy: z.enum(['public', 'private']).default('public'),
  approvalRequired: z.coerce.boolean().default(false),
  ageLimit: z.coerce.number().int().min(0).optional(),
  refundPolicy: z.string().max(500).optional(),
  status: z.enum(['draft', 'published']).default('draft'),
});

export const updateEventSchema = createEventSchema.partial().omit({ status: true });

export const cancelEventSchema = z.object({
  reason: z.string().min(5).max(500).optional(),
});
