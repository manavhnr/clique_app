import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { createReport } from '../services/report.service';
import { sendSuccess } from '../utils/response';

export async function submitReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { targetType, targetId, reason, description } = req.body;
    const report = await createReport(req.user!.userId, targetType, targetId, reason, description);
    sendSuccess(res, { report }, 'Report submitted', 201);
  } catch (err) { next(err); }
}
