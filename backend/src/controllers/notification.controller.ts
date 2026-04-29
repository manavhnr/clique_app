import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import {
  registerFCMToken,
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../services/notification.service';

const parsePage = (q: unknown) => Math.max(1, parseInt(String(q ?? 1)));
const parseLimit = (q: unknown) => Math.min(50, Math.max(1, parseInt(String(q ?? 20))));

export async function registerToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await registerFCMToken(req.user!.userId, req.body.fcmToken, req.body.platform);
    sendSuccess(res, null, 'Token registered');
  } catch (err) { next(err); }
}

export async function list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const result = await getNotifications(req.user!.userId, page, limit);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function read(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await markAsRead(req.params.notificationId, req.user!.userId);
    sendSuccess(res, null, 'Marked as read');
  } catch (err) { next(err); }
}

export async function readAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await markAllAsRead(req.user!.userId);
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
}
