import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import {
  followUser,
  unfollowUser,
  blockUser,
  unblockUser,
  getFollowers,
  getFollowing,
  getMutuals,
  getBlockedUsers,
  getRelationshipStatus,
} from '../services/relationship.service';

const parsePage = (q: unknown) => Math.max(1, parseInt(String(q ?? 1)));
const parseLimit = (q: unknown) => Math.min(50, Math.max(1, parseInt(String(q ?? 20))));

export async function follow(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await followUser(req.user!.userId, req.params.userId);
    sendSuccess(res, null, 'Followed successfully');
  } catch (err) { next(err); }
}

export async function unfollow(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await unfollowUser(req.user!.userId, req.params.userId);
    sendSuccess(res, null, 'Unfollowed successfully');
  } catch (err) { next(err); }
}

export async function block(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await blockUser(req.user!.userId, req.params.userId);
    sendSuccess(res, null, 'User blocked');
  } catch (err) { next(err); }
}

export async function unblock(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await unblockUser(req.user!.userId, req.params.userId);
    sendSuccess(res, null, 'User unblocked');
  } catch (err) { next(err); }
}

export async function followers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const users = await getFollowers(req.params.userId, page, limit);
    sendSuccess(res, { users, page, limit });
  } catch (err) { next(err); }
}

export async function following(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const users = await getFollowing(req.params.userId, page, limit);
    sendSuccess(res, { users, page, limit });
  } catch (err) { next(err); }
}

export async function mutuals(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const users = await getMutuals(req.params.userId, page, limit);
    sendSuccess(res, { users, page, limit });
  } catch (err) { next(err); }
}

export async function blocked(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const users = await getBlockedUsers(req.user!.userId, page, limit);
    sendSuccess(res, { users, page, limit });
  } catch (err) { next(err); }
}

export async function relationshipStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = await getRelationshipStatus(req.user!.userId, req.params.userId);
    sendSuccess(res, status);
  } catch (err) { next(err); }
}
