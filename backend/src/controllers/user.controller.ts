import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { getProfile, getUserById, updateProfile, updateProfileImage, deleteAccount } from '../services/user.service';
import { initiateOTP } from '../services/auth.service';
import { OTP } from '../models/OTP';
import { User } from '../models/User';
import { hashOTP } from '../services/otp.service';
import { createError } from '../middleware/error.middleware';
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

    const digits = newPhone.replace(/\D/g, '');
    const normalized = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;

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

    const digits = newPhone.replace(/\D/g, '');
    const normalized = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;

    const record = await OTP.findOne({ phone: normalized });
    if (!record) throw createError('OTP not found or expired', 400);
    if (record.otpHash !== hashOTP(otp)) throw createError('Invalid OTP', 400);
    if (record.expiresAt < new Date()) throw createError('OTP expired', 400);

    const existing = await User.findOne({ phone: normalized, _id: { $ne: req.user!.userId } });
    if (existing) throw createError('Phone number already in use by another account', 409);

    await OTP.deleteOne({ _id: record._id });

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
