import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import {
  applyForHost,
  getVerificationStatus,
  approveHost,
  rejectHost,
  getPendingVerifications,
} from '../services/host.service';

export async function apply(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const documentFile = files?.document?.[0];
    const selfieFile = files?.selfie?.[0];

    const { documentType, address } = req.body;
    const verification = await applyForHost(req.user!.userId, documentType, address, documentFile, selfieFile);

    sendSuccess(res, { verification }, 'Host application submitted', 201);
  } catch (err) { next(err); }
}

export async function status(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getVerificationStatus(req.user!.userId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function approve(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await approveHost(req.params.userId, req.user!.userId);
    sendSuccess(res, null, 'Host approved. User must re-login to receive updated role.');
  } catch (err) { next(err); }
}

export async function reject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await rejectHost(req.params.userId, req.user!.userId, req.body.rejectionReason);
    sendSuccess(res, null, 'Host application rejected');
  } catch (err) { next(err); }
}

export async function pending(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? 1)));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? 20))));
    const result = await getPendingVerifications(page, limit);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}
