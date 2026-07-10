import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { User, IUser } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { createError } from '../middleware/error.middleware';
import { normalizePhone } from '../utils/phone';
import { sendOTP, verifyOTP } from './otp.service';

const REFRESH_TTL_DAYS = 30;

async function generateUniqueUsername(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const suffix = crypto.randomBytes(4).toString('hex');
    const candidate = `user_${suffix}`;
    const exists = await User.findOne({ username: candidate });
    if (!exists) return candidate;
  }
  throw new Error('Could not generate unique username');
}

export function signAccessToken(userId: string, role: string): string {
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

export async function revokeAllSessions(userId: string): Promise<void> {
  await RefreshToken.deleteMany({ userId });
}

// ─── OTP ──────────────────────────────────────────────────────────────────────

export async function initiateOTP(phone: string): Promise<void> {
  const normalizedPhone = normalizePhone(phone);
  await sendOTP(normalizedPhone);
}

export async function consumeOTP(phone: string, otp: string): Promise<void> {
  const normalizedPhone = normalizePhone(phone);
  const valid = await verifyOTP(normalizedPhone, otp);
  if (!valid) throw createError('Invalid or expired OTP', 400);
}

export async function verifyOTPAndLogin(
  phone: string,
  otp: string
): Promise<{ token: string; refreshToken: string; user: IUser; isNewUser: boolean; needsSetup: boolean }> {
  const normalizedPhone = normalizePhone(phone);
  await consumeOTP(normalizedPhone, otp);

  let isNewUser = false;
  let user = await User.findOne({ phone: normalizedPhone });

  if (!user) {
    isNewUser = true;
    const username = await generateUniqueUsername();
    user = await User.create({ phone: normalizedPhone, name: '', username });
  }

  if (user.isBanned) throw createError('Account banned', 403);

  const needsSetup = !user.hasCompletedSetup;

  const token = signAccessToken(user._id.toString(), user.role);
  const refreshToken = await issueRefreshToken(user._id.toString());

  return { token, refreshToken, user, isNewUser, needsSetup };
}

// ─── Password auth ────────────────────────────────────────────────────────────

export async function loginWithPassword(
  identifier: string,
  password: string
): Promise<{ token: string; refreshToken: string; user: IUser }> {
  const isPhone = /^\+?[0-9]{10,15}$/.test(identifier.replace(/\s/g, ''));
  const lookup = isPhone
    ? { phone: normalizePhone(identifier) }
    : { username: identifier.toLowerCase() };

  const user = await User.findOne(lookup).select('+password');

  if (!user) throw createError('No account found with those details', 404);
  if (user.isBanned) throw createError('Account banned', 403);
  if (!user.password) throw createError('No password set — sign in with OTP instead', 400);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw createError('Incorrect password', 401);

  const token = signAccessToken(user._id.toString(), user.role);
  const refreshToken = await issueRefreshToken(user._id.toString());

  // strip password from returned user object
  const userObj = user.toObject() as IUser & { password?: string };
  delete userObj.password;

  return { token, refreshToken, user: userObj as IUser };
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

export async function registerWithPassword(
  phone: string,
  password: string
): Promise<{ token: string; refreshToken: string; user: IUser; needsSetup: boolean }> {
  const normalizedPhone = normalizePhone(phone);

  const existing = await User.findOne({ phone: normalizedPhone });
  if (existing) throw createError('An account with this number already exists', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const username = await generateUniqueUsername();

  const user = await User.create({
    phone: normalizedPhone,
    password: passwordHash,
    name: '',
    username,
  });

  const token = signAccessToken(user._id.toString(), user.role);
  const refreshToken = await issueRefreshToken(user._id.toString());

  // strip password before returning
  const userObj = user.toObject() as IUser & { password?: string };
  delete userObj.password;

  return { token, refreshToken, user: userObj as IUser, needsSetup: true };
}
