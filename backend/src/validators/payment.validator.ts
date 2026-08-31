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
  utrNumber: z.string().min(6, 'Enter a valid UTR number').optional(),
  upiId: z.string().min(3, 'Enter a valid UPI ID').optional(),
  transactionProofUrl: z.string().url().optional(),
}).refine(data => data.utrNumber || data.upiId, {
  message: 'Enter either your UTR number or the UPI ID you paid from',
  path: ['utrNumber'],
});
