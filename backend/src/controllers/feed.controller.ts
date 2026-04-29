import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { getHomeFeed } from '../services/feed.service';

export async function homeFeed(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const cursor = req.query.cursor as string | undefined;
    const latitude = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const longitude = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

    const { items, nextCursor } = await getHomeFeed(req.user!.userId, cursor, latitude, longitude);
    sendSuccess(res, { items, nextCursor });
  } catch (err) {
    next(err);
  }
}
