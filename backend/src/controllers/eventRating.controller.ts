import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { rateEvent, getEventRatings } from '../services/eventRating.service';
import { sendSuccess } from '../utils/response';

export async function submitRating(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { eventId, targetUserId, rating } = req.body;
    const eventRating = await rateEvent(req.user!.userId, eventId, targetUserId, rating);
    sendSuccess(res, { eventRating }, 'Rating submitted', 201);
  } catch (err) { next(err); }
}

export async function listEventRatings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { eventId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await getEventRatings(eventId, page, limit);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}
