import { Relationship } from '../models/Relationship';
import { User } from '../models/User';
import { RelationshipProvider } from './relationship.provider.interface';
import { createError } from '../middleware/error.middleware';

export class MongoRelationshipProvider implements RelationshipProvider {
  async follow(requesterId: string, receiverId: string): Promise<void> {
    const existing = await Relationship.findOne({
      requesterId,
      receiverId,
      type: 'follow',
    });
    if (existing) throw createError('Already following', 409);

    const blocked = await Relationship.findOne({
      $or: [
        { requesterId, receiverId, type: 'block' },
        { requesterId: receiverId, receiverId: requesterId, type: 'block' },
      ],
    });
    if (blocked) throw createError('Cannot follow this user', 403);

    await Relationship.create({ requesterId, receiverId, type: 'follow', status: 'accepted' });
    await User.findByIdAndUpdate(requesterId, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(receiverId, { $inc: { followerCount: 1 } });
  }

  async unfollow(requesterId: string, receiverId: string): Promise<void> {
    const result = await Relationship.findOneAndDelete({ requesterId, receiverId, type: 'follow' });
    if (!result) throw createError('Not following this user', 404);
    await User.findByIdAndUpdate(requesterId, { $inc: { followingCount: -1 } });
    await User.findByIdAndUpdate(receiverId, { $inc: { followerCount: -1 } });
  }

  async block(requesterId: string, receiverId: string): Promise<void> {
    // Remove any existing follow relationships both ways
    await Relationship.deleteMany({
      $or: [
        { requesterId, receiverId, type: 'follow' },
        { requesterId: receiverId, receiverId: requesterId, type: 'follow' },
      ],
    });

    await Relationship.findOneAndUpdate(
      { requesterId, receiverId, type: 'block' },
      { requesterId, receiverId, type: 'block', status: 'blocked' },
      { upsert: true }
    );
  }

  async unblock(requesterId: string, receiverId: string): Promise<void> {
    const result = await Relationship.findOneAndDelete({ requesterId, receiverId, type: 'block' });
    if (!result) throw createError('Not blocking this user', 404);
  }

  async isFollowing(requesterId: string, receiverId: string): Promise<boolean> {
    const r = await Relationship.findOne({ requesterId, receiverId, type: 'follow' });
    return !!r;
  }

  async isBlocked(requesterId: string, receiverId: string): Promise<boolean> {
    const r = await Relationship.findOne({
      $or: [
        { requesterId, receiverId, type: 'block' },
        { requesterId: receiverId, receiverId: requesterId, type: 'block' },
      ],
    });
    return !!r;
  }

  async getFollowers(userId: string, page: number, limit: number): Promise<string[]> {
    const records = await Relationship.find({ receiverId: userId, type: 'follow' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('requesterId');
    return records.map((r) => r.requesterId.toString());
  }

  async getFollowing(userId: string, page: number, limit: number): Promise<string[]> {
    const records = await Relationship.find({ requesterId: userId, type: 'follow' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('receiverId');
    return records.map((r) => r.receiverId.toString());
  }

  async getMutuals(userId: string, page: number, limit: number): Promise<string[]> {
    const following = await Relationship.find({ requesterId: userId, type: 'follow' }).select('receiverId');
    const followingIds = following.map((r) => r.receiverId.toString());

    const mutuals = await Relationship.find({
      requesterId: { $in: followingIds },
      receiverId: userId,
      type: 'follow',
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('requesterId');

    return mutuals.map((r) => r.requesterId.toString());
  }

  async getFollowerCount(userId: string): Promise<number> {
    return Relationship.countDocuments({ receiverId: userId, type: 'follow' });
  }

  async getFollowingCount(userId: string): Promise<number> {
    return Relationship.countDocuments({ requesterId: userId, type: 'follow' });
  }
}
