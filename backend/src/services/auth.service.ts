import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OTP } from '../models/OTP';
import { User, IUser } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { generateOTP, hashOTP, sendOTP } from './otp.service';
import { createError } from '../middleware/error.middleware';

const OTP_TTL_MINUTES = 10;
const REFRESH_TTL_DAYS = 30;

function signAccessToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET as string,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'] }
  );
}

async function issueRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.deleteMany({ userId }); // one active refresh token per user
  await RefreshToken.create({ userId, tokenHash, expiresAt });

  return raw;
}

export async function initiateOTP(phone: string): Promise<void> {
  const otp = generateOTP();
  const otpHash = hashOTP(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await OTP.deleteMany({ phone });
  await OTP.create({ phone, otpHash, expiresAt });

  await sendOTP(phone, otp);
}

export async function verifyOTPAndLogin(
  phone: string,
  otp: string
): Promise<{ token: string; refreshToken: string; user: IUser; isNewUser: boolean }> {
  const record = await OTP.findOne({ phone });

  if (!record) throw createError('OTP not found or expired', 400);
  if (record.otpHash !== hashOTP(otp)) throw createError('Invalid OTP', 400);
  if (record.expiresAt < new Date()) throw createError('OTP expired', 400);

  await OTP.deleteOne({ _id: record._id });

  let isNewUser = false;
  let user = await User.findOne({ phone });

  if (!user) {
    isNewUser = true;
    user = await User.create({ phone, name: '', username: `user_${Date.now()}` });
  }

  if (user.isBanned) throw createError('Account banned', 403);

  const token = signAccessToken(user._id.toString(), user.role);
  const refreshToken = await issueRefreshToken(user._id.toString());

  return { token, refreshToken, user, isNewUser };
}

export async function refreshAccessToken(
  rawRefreshToken: string
): Promise<{ token: string; refreshToken: string }> {
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const record = await RefreshToken.findOne({ tokenHash });

  if (!record) throw createError('Invalid refresh token', 401);
  if (record.expiresAt < new Date()) {
    await RefreshToken.deleteOne({ _id: record._id });
    throw createError('Refresh token expired', 401);
  }

  const user = await User.findById(record.userId).select('role isBanned');
  if (!user || user.isBanned) throw createError('Account not accessible', 403);

  const token = signAccessToken(record.userId.toString(), user.role);
  const newRawRefreshToken = await issueRefreshToken(record.userId.toString());

  return { token, refreshToken: newRawRefreshToken };
}

export async function revokeRefreshToken(rawRefreshToken: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  await RefreshToken.deleteOne({ tokenHash });
}

export async function getCurrentUser(userId: string): Promise<IUser> {
  const user = await User.findById(userId).select('-__v');
  if (!user) throw createError('User not found', 404);
  if (user.isBanned) throw createError('Account banned', 403);
  return user;
}
