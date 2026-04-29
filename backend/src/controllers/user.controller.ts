import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { getProfile, getUserById, updateProfile, updateProfileImage, deleteAccount } from '../services/user.service';
import { sendSuccess } from '../utils/response';
import path from 'path';

export async function getMyProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getProfile(req.user!.userId);
    sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
}

export async function getPublicProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserById(req.params.userId, req.user!.userId);
    sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
}

export async function updateMyProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await updateProfile(req.user!.userId, req.body);
    sendSuccess(res, { user }, 'Profile updated');
  } catch (err) {
    next(err);
  }
}

export async function uploadMyProfileImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image uploaded' });
      return;
    }
    const imageUrl = `/uploads/${path.basename(req.file.path)}`;
    const user = await updateProfileImage(req.user!.userId, imageUrl);
    sendSuccess(res, { user, imageUrl }, 'Profile image updated');
  } catch (err) {
    next(err);
  }
}

export async function deleteMyAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteAccount(req.user!.userId);
    sendSuccess(res, null, 'Account deleted');
  } catch (err) {
    next(err);
  }
}
