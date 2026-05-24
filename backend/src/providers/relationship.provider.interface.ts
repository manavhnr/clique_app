export interface RelationshipProvider {
  follow(requesterId: string, receiverId: string): Promise<void>;
  unfollow(requesterId: string, receiverId: string): Promise<void>;
  block(requesterId: string, receiverId: string): Promise<void>;
  unblock(requesterId: string, receiverId: string): Promise<void>;
  isFollowing(requesterId: string, receiverId: string): Promise<boolean>;
  isBlocked(requesterId: string, receiverId: string): Promise<boolean>;
  getFollowers(userId: string, page: number, limit: number): Promise<string[]>;
  getFollowing(userId: string, page: number, limit: number): Promise<string[]>;
  getMutuals(userId: string, page: number, limit: number): Promise<string[]>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  getBlocked(userId: string, page: number, limit: number): Promise<string[]>;
}
