import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { getMyPasses, getPassById, scanPass, verifyPass } from '../services/pass.service';

export async function myPasses(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getMyPasses(req.user!.userId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function getPass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const pass = await getPassById(req.params.passId, req.user!.userId);
    sendSuccess(res, { pass });
  } catch (err) { next(err); }
}

export async function verify(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { qrToken, eventId } = req.body;
    if (!qrToken || !eventId) {
      res.status(400).json({ success: false, message: 'qrToken and eventId are required' });
      return;
    }
    const result = await verifyPass(qrToken, req.user!.userId, eventId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function scan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { qrToken, eventId } = req.body;
    if (!qrToken || !eventId) {
      res.status(400).json({ success: false, message: 'qrToken and eventId are required' });
      return;
    }
    const result = await scanPass(qrToken, req.user!.userId, eventId);
    sendSuccess(res, result, result.message);
  } catch (err) { next(err); }
}
