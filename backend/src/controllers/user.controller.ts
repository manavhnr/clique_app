import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { getProfile, getUserById, updateProfile, updateProfileImage, deleteAccount } from '../services/user.service';
import { initiateOTP, consumeOTP } from '../services/auth.service';
import { User } from '../models/User';
import { normalizePhone } from '../utils/phone';
import { createError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import { uploadFile } from '../utils/cloudinary';

export async function checkUsername(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const username = (req.query.username as string ?? '').toLowerCase().trim();
    if (!username) { res.status(400).json({ success: false, message: 'username is required' }); return; }
    const taken = await User.exists({ username, _id: { $ne: req.user?.userId } });
    sendSuccess(res, { available: !taken });
  } catch (err) { next(err); }
}

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
    const imageUrl = await uploadFile(req.file, 'clique/profiles', `profile-${req.user!.userId}`);
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

export async function saveUpiId(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { upiId } = req.body as { upiId: string };
    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { upiId: upiId.trim().toLowerCase(), payoutStatus: 'active' },
      { new: true }
    );
    sendSuccess(res, { upiId: user?.upiId, payoutStatus: user?.payoutStatus }, 'UPI ID saved');
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { isPrivate, pushNotificationsEnabled } = req.body;
    const update: Record<string, unknown> = {};
    if (isPrivate !== undefined) update.isPrivate = isPrivate;
    if (pushNotificationsEnabled !== undefined) update.pushNotificationsEnabled = pushNotificationsEnabled;

    const user = await User.findByIdAndUpdate(req.user!.userId, update, { new: true });
    sendSuccess(res, { user }, 'Settings updated');
  } catch (err) {
    next(err);
  }
}

export async function requestPhoneChange(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { newPhone } = req.body;
    const normalized = normalizePhone(newPhone);

    const existing = await User.findOne({ phone: normalized, _id: { $ne: req.user!.userId } });
    if (existing) throw createError('Phone number already in use by another account', 409);

    await initiateOTP(normalized);
    sendSuccess(res, null, 'OTP sent to new phone number');
  } catch (err) {
    next(err);
  }
}

export async function verifyPhoneChange(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { newPhone, otp } = req.body;
    const normalized = normalizePhone(newPhone);

    const existing = await User.findOne({ phone: normalized, _id: { $ne: req.user!.userId } });
    if (existing) throw createError('Phone number already in use by another account', 409);

    await consumeOTP(normalized, otp);

    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { phone: normalized },
      { new: true }
    );

    sendSuccess(res, { user }, 'Phone number updated');
  } catch (err) {
    next(err);
  }
}
