import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import {
  listUsers, banUser, unbanUser,
  listEvents, blockEvent, unblockEvent,
  listReports, resolveReport,
  getDashboardStats,
} from '../services/admin.service';

const parsePage = (q: unknown) => Math.max(1, parseInt(String(q ?? 1)));
const parseLimit = (q: unknown) => Math.min(100, Math.max(1, parseInt(String(q ?? 20))));

export async function stats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getDashboardStats();
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function users(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listUsers(parsePage(req.query.page), parseLimit(req.query.limit), req.query.q as string);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function ban(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await banUser(req.params.userId, req.user!.userId);
    sendSuccess(res, null, 'User banned');
  } catch (err) { next(err); }
}

export async function unban(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await unbanUser(req.params.userId, req.user!.userId);
    sendSuccess(res, null, 'User unbanned');
  } catch (err) { next(err); }
}

export async function events(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listEvents(parsePage(req.query.page), parseLimit(req.query.limit), req.query.status as string);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function blockEv(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await blockEvent(req.params.eventId, req.user!.userId);
    sendSuccess(res, null, 'Event blocked');
  } catch (err) { next(err); }
}

export async function unblockEv(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await unblockEvent(req.params.eventId, req.user!.userId);
    sendSuccess(res, null, 'Event unblocked');
  } catch (err) { next(err); }
}

export async function reports(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listReports(parsePage(req.query.page), parseLimit(req.query.limit), req.query.status as string);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function resolveRep(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const resolution = req.body.resolution as 'resolved' | 'dismissed';
    if (!['resolved', 'dismissed'].includes(resolution)) {
      res.status(400).json({ success: false, message: 'resolution must be resolved or dismissed' });
      return;
    }
    await resolveReport(req.params.reportId, req.user!.userId, resolution);
    sendSuccess(res, null, `Report ${resolution}`);
  } catch (err) { next(err); }
}
