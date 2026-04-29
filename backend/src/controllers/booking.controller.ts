import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { createBooking, cancelBooking, getMyBookings } from '../services/booking.service';

const parsePage = (q: unknown) => Math.max(1, parseInt(String(q ?? 1)));
const parseLimit = (q: unknown) => Math.min(50, Math.max(1, parseInt(String(q ?? 20))));

export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { eventId } = req.body;
    const result = await createBooking(req.user!.userId, eventId);
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
