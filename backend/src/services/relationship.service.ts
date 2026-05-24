import { User } from '../models/User';
import { MongoRelationshipProvider } from '../providers/mongo.relationship.provider';
import { createError } from '../middleware/error.middleware';
import { notifyNewFollower } from './notification.service';

const provider = new MongoRelationshipProvider();

export async function followUser(requesterId: string, receiverId: string): Promise<void> {
  if (requesterId === receiverId) throw createError('Cannot follow yourself', 400);
  const [requester, target] = await Promise.all([
    User.findById(requesterId).select('name'),
    User.findById(receiverId).select('isBanned'),
  ]);
  if (!target || target.isBanned) throw createError('User not found', 404);
  await provider.follow(requesterId, receiverId);
  void notifyNewFollower(receiverId, requester?.name || 'Someone');
}

export async function unfollowUser(requesterId: string, receiverId: string): Promise<void> {
  if (requesterId === receiverId) throw createError('Cannot unfollow yourself', 400);
  await provider.unfollow(requesterId, receiverId);
}

export async function blockUser(requesterId: string, receiverId: string): Promise<void> {
  if (requesterId === receiverId) throw createError('Cannot block yourself', 400);
  const target = await User.findById(receiverId);
  if (!target) throw createError('User not found', 404);
  await provider.block(requesterId, receiverId);
}

export async function unblockUser(requesterId: string, receiverId: string): Promise<void> {
  await provider.unblock(requesterId, receiverId);
}

export async function getFollowers(userId: string, page: number, limit: number) {
  const ids = await provider.getFollowers(userId, page, limit);
  const users = await User.find({ _id: { $in: ids }, isBanned: false }).select(
    'name username profileImage bio cliquescore followerCount'
  );
  return users;
}

export async function getFollowing(userId: string, page: number, limit: number) {
  const ids = await provider.getFollowing(userId, page, limit);
  const users = await User.find({ _id: { $in: ids }, isBanned: false }).select(
    'name username profileImage bio cliquescore followerCount'
  );
  return users;
}

export async function getMutuals(userId: string, page: number, limit: number) {
  const ids = await provider.getMutuals(userId, page, limit);
  const users = await User.find({ _id: { $in: ids }, isBanned: false }).select(
    'name username profileImage bio cliquescore followerCount'
  );
  return users;
}

export async function getBlockedUsers(userId: string, page: number, limit: number) {
  const ids = await provider.getBlocked(userId, page, limit);
  const users = await User.find({ _id: { $in: ids } }).select(
    'name username profileImage'
  );
  return users;
}

export async function getRelationshipStatus(requesterId: string, targetId: string) {
  const [isFollowing, isBlocked] = await Promise.all([
    provider.isFollowing(requesterId, targetId),
    provider.isBlocked(requesterId, targetId),
  ]);
  return { isFollowing, isBlocked };
}
