import { z } from 'zod';

export const createOrderSchema = z.object({
  bookingId: z.string().min(1),
});

export const verifyPaymentSchema = z.object({
  bookingId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
