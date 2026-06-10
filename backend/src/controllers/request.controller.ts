import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import {
  requestAccess,
  getHostRequests,
  approveRequest,
  rejectRequest,
  getRequestStatus,
} from '../services/request.service';

const parsePage = (q: unknown) => Math.max(1, parseInt(String(q ?? 1)));
const parseLimit = (q: unknown) => Math.min(50, Math.max(1, parseInt(String(q ?? 20))));

export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { eventId, message } = req.body;
    const request = await requestAccess(req.user!.userId, eventId, message);
    sendSuccess(res, { request }, 'Access requested', 201);
  } catch (err) { next(err); }
}

export async function hostRequests(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const eventId = req.query.eventId as string | undefined;
    const result = await getHostRequests(req.user!.userId, eventId, page, limit, req.query.status as string | undefined);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function approve(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await approveRequest(req.params.requestId, req.user!.userId);
    sendSuccess(res, null, 'Request approved');
  } catch (err) { next(err); }
}

export async function reject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await rejectRequest(req.params.requestId, req.user!.userId, req.body.rejectionReason);
    sendSuccess(res, null, 'Request rejected');
  } catch (err) { next(err); }
}

export async function status(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getRequestStatus(req.user!.userId, req.params.eventId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}
