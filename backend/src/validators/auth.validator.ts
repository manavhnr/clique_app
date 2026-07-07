import { z } from 'zod';

export const sendOTPSchema = z.object({
  phone: z
    .string()
    .min(10)
    .max(15)
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
});

export const verifyOTPSchema = z.object({
  phone: z
    .string()
    .min(10)
    .max(15)
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Phone or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  phone: z
    .string()
    .min(10)
    .max(15)
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
