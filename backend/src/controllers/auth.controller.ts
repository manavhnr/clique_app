import { Request, Response, NextFunction } from 'express';
import { initiateOTP, verifyOTPAndLogin, refreshAccessToken, revokeRefreshToken, getCurrentUser } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';

export async function sendOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await initiateOTP(req.body.phone);
    sendSuccess(res, null, 'OTP sent successfully');
  } catch (err) { next(err); }
}

export async function verifyOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone, otp } = req.body;
    const { token, refreshToken, user, isNewUser } = await verifyOTPAndLogin(phone, otp);
    sendSuccess(
      res,
      { token, refreshToken, user, isNewUser },
      isNewUser ? 'Account created' : 'Login successful',
      isNewUser ? 201 : 200
    );
  } catch (err) { next(err); }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, message: 'refreshToken is required' });
      return;
    }
    const tokens = await refreshAccessToken(refreshToken);
    sendSuccess(res, tokens, 'Token refreshed');
  } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await revokeRefreshToken(refreshToken);
    sendSuccess(res, null, 'Logged out');
  } catch (err) { next(err); }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getCurrentUser(req.user!.userId);
    sendSuccess(res, { user });
  } catch (err) { next(err); }
}
