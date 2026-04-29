import { z } from 'zod';

export const applyHostSchema = z.object({
  documentType: z.enum(['aadhar', 'pan', 'passport', 'driving_license', 'voter_id']),
  address: z.string().min(10).max(500),
});

export const rejectHostSchema = z.object({
  rejectionReason: z.string().min(5).max(500),
});
