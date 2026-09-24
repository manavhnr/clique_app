import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { createBooking, cancelBooking, getMyBookings, getEventBookings, addToGuestlist, hostRemoveGuest } from '../services/booking.service';

const parsePage = (q: unknown) => Math.max(1, parseInt(String(q ?? 1)));
const parseLimit = (q: unknown) => Math.min(50, Math.max(1, parseInt(String(q ?? 20))));

export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { eventId, tierLabel, groupPricingIndex } = req.body;
    const result = await createBooking(req.user!.userId, eventId, tierLabel, groupPricingIndex);
    const message = result.pass ? 'Booking confirmed. Pass generated.' : 'Booking created. Complete payment to confirm.';
    sendSuccess(res, result, message, 201);
  } catch (err) { next(err); }
}

export async function myBookings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const result = await getMyBookings(req.user!.userId, page, limit);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function cancel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await cancelBooking(req.params.bookingId, req.user!.userId);
    sendSuccess(res, null, 'Booking cancelled');
  } catch (err) { next(err); }
}

export async function eventBookings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getEventBookings(req.user!.userId, req.params.eventId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function guestlistAdd(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await addToGuestlist(req.user!.userId, req.params.eventId, req.body.username);
    sendSuccess(res, result, 'Added to guestlist. Pass generated.', 201);
  } catch (err) { next(err); }
}

export async function hostRemoveGuestHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await hostRemoveGuest(req.user!.userId, req.params.eventId, req.params.bookingId);
    const msg = result.refunded ? 'Guest removed and refund issued.' : 'Guest removed.';
    sendSuccess(res, result, msg);
  } catch (err) { next(err); }
}
