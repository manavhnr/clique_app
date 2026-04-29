import { User, IUser } from '../models/User';
import { createError } from '../middleware/error.middleware';
import { z } from 'zod';
import { updateProfileSchema } from '../validators/user.validator';

type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export async function getProfile(userId: string): Promise<IUser> {
  const user = await User.findById(userId).select('-__v');
  if (!user) throw createError('User not found', 404);
  return user;
}

export async function getUserById(targetId: string, requesterId: string): Promise<Partial<IUser>> {
  const user = await User.findById(targetId).select(
    'name username profileImage bio city interests vibeTags cliquescore followerCount followingCount postCount role isVerifiedHost createdAt'
  );
  if (!user) throw createError('User not found', 404);
  if (user.isBanned && targetId !== requesterId) throw createError('User not found', 404);
  return user;
}

export async function updateProfile(userId: string, data: UpdateProfileInput): Promise<IUser> {
  if (data.username) {
    const existing = await User.findOne({ username: data.username, _id: { $ne: userId } });
    if (existing) throw createError('Username already taken', 409);
  }

  const update: Record<string, unknown> = { ...data };

  if (data.dob) {
    const dob = new Date(data.dob);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    update.dob = dob;
    update.age = age;
  }

  if (data.location) {
    update['location'] = {
      type: 'Point',
      coordinates: [data.location.longitude, data.location.latitude],
    };
  }

  const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true }).select('-__v');
  if (!user) throw createError('User not found', 404);
  return user;
}

export async function updateProfileImage(userId: string, imageUrl: string): Promise<IUser> {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { profileImage: imageUrl } },
    { new: true }
  ).select('-__v');
  if (!user) throw createError('User not found', 404);
  return user;
}

export async function deleteAccount(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) throw createError('User not found', 404);
  // Soft delete — mark banned and anonymize PII
  await User.findByIdAndUpdate(userId, {
    $set: {
      isBanned: true,
      name: 'Deleted User',
      username: `deleted_${userId}`,
      phone: `deleted_${userId}`,
      profileImage: undefined,
      bio: undefined,
    },
  });
}
