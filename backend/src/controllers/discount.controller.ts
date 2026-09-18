import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import {
  addDiscounts,
  getEventDiscounts,
  updateDiscount,
  revokeDiscount,
} from '../services/discount.service';

export async function addDiscountsHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { usernames, discountType, discountValue } = req.body;
    const result = await addDiscounts(req.user!.userId, req.params.eventId, usernames, discountType, discountValue);
    sendSuccess(res, result, 'Discounts applied', 201);
  } catch (err) { next(err); }
}

export async function getDiscountsHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getEventDiscounts(req.user!.userId, req.params.eventId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function updateDiscountHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { discountType, discountValue } = req.body;
    await updateDiscount(req.user!.userId, req.params.eventId, req.params.discountId, discountType, discountValue);
    sendSuccess(res, null, 'Discount updated');
  } catch (err) { next(err); }
}

export async function revokeDiscountHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await revokeDiscount(req.user!.userId, req.params.eventId, req.params.discountId);
    sendSuccess(res, null, 'Discount revoked');
  } catch (err) { next(err); }
}
