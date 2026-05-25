import { z } from 'zod';

// FormData sends booleans as "true"/"false" strings; z.coerce.boolean treats any
// non-empty string as true. Normalise explicitly.
const boolField = z.preprocess(
  (v) => v === true || v === 'true' || v === '1' || v === 1,
  z.boolean()
);

// FormData may send a single-element array as a plain string; normalise both cases.
const stringArray = z.preprocess(
  (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v !== '') return [v];
    return [];
  },
  z.array(z.string().max(50)).max(10)
);

// ageLimit comes as "" when not filled — treat empty string as undefined
const optionalInt = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().min(0).optional()
);

export const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(3000),
  category: z.enum(['house_party', 'club', 'college', 'private', 'concert', 'other']),
  vibeTags: stringArray.default([]),
  musicTags: stringArray.default([]),
  rules: z.string().max(1000).optional(),
  date: z.string().datetime(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  locationName: z.string().min(2).max(300),
  address: z.string().min(5).max(500),
  latitude: z.coerce.number().min(-90).max(90).default(0),
  longitude: z.coerce.number().min(-180).max(180).default(0),
  exactAddressHiddenBeforeBooking: boolField.default(false),
  price: z.coerce.number().min(0),
  platformFee: z.coerce.number().min(0).default(0),
  capacity: z.coerce.number().int().min(1),
  privacy: z.enum(['public', 'private']).default('public'),
  approvalRequired: boolField.default(false),
  ageLimit: optionalInt,
  refundPolicy: z.string().max(500).optional(),
  status: z.enum(['draft', 'published']).default('draft'),
});

export const updateEventSchema = createEventSchema.partial().omit({ status: true });

export const cancelEventSchema = z.object({
  reason: z.string().min(5).max(500).optional(),
});
