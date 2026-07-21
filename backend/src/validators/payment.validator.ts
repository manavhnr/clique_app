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

export const submitUPISchema = z.object({
  bookingId: z.string().min(1),
  utrNumber: z.string().min(6, 'Enter a valid UTR number'),
  transactionProofUrl: z.string().url().optional(),
});
