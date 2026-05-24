import { z } from 'zod';

const phoneSchema = z
  .string()
  .regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number');

export const requestPhoneChangeSchema = z.object({
  newPhone: phoneSchema,
});

export const verifyPhoneChangeSchema = z.object({
  newPhone: phoneSchema,
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
});

export const updateSettingsSchema = z.object({
  isPrivate: z.boolean().optional(),
  pushNotificationsEnabled: z.boolean().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores')
    .optional(),
  bio: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  dob: z.string().datetime().optional(),
  interests: z.array(z.string().max(50)).max(20).optional(),
  vibeTags: z.array(z.string().max(50)).max(10).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});
