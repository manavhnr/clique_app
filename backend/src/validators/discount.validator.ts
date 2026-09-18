import { z } from 'zod';

const discountBase = z.object({
  discountType: z.enum(['percentage', 'absolute']),
  discountValue: z.coerce.number().positive(),
});

export const addDiscountsSchema = discountBase
  .extend({
    usernames: z.array(z.string().min(1).max(50)).min(1).max(50),
  })
  .refine(
    (d) => d.discountType !== 'percentage' || d.discountValue <= 100,
    { message: 'Percentage discount cannot exceed 100', path: ['discountValue'] }
  );

export const updateDiscountSchema = discountBase.refine(
  (d) => d.discountType !== 'percentage' || d.discountValue <= 100,
  { message: 'Percentage discount cannot exceed 100', path: ['discountValue'] }
);
