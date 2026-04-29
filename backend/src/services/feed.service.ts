import { Post } from '../models/Post';
import { Event } from '../models/Event';
import { Relationship } from '../models/Relationship';
import { Like } from '../models/Like';

const FEED_LIMIT = 20;
const TRENDING_SLOTS = 3;
const EVENT_CARD_SLOTS = 2;

interface FeedItem {
  type: 'post' | 'event_card';
  data: unknown;
  score?: number;
}

export async function getHomeFeed(
  userId: string,
  cursor?: string,
  latitude?: number,
  longitude?: number
): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const cursorDate = cursor ? new Date(parseInt(cursor)) : new Date();

  // 1. Get IDs of users the requester follows
  const following = await Relationship.find({ requesterId: userId, type: 'follow' }).select('receiverId');
  const followingIds = following.map((r) => r.receiverId);

  const isColdStart = followingIds.length === 0;

  // 2. Posts from followed users/hosts (primary feed) — empty on cold start
  const followedPosts = isColdStart ? [] : await Post.find({
    userId: { $in: followingIds },
    status: 'active',
    visibility: { $in: ['public', 'followers'] },
    createdAt: { $lt: cursorDate },
  })
    .sort({ createdAt: -1 })
    .limit(FEED_LIMIT)
    .populate('userId', 'name username profileImage isVerifiedHost role')
    .populate('linkedEventId', 'title date locationName price');

  // 3. Trending posts — fill full feed on cold start, supplement otherwise
  const trendingLimit = isColdStart ? FEED_LIMIT : TRENDING_SLOTS;
  const followedPostIds = followedPosts.map((p) => p._id);
  const trendingPosts = await Post.find({
    _id: { $nin: followedPostIds },
    userId: { $nin: [...followingIds, userId] },
    status: 'active',
    visibility: 'public',
    createdAt: { $gte: new Date(Date.now() - 72 * 60 * 60 * 1000) }, // last 72h
  })
    .sort({ likeCount: -1, commentCount: -1 })
    .limit(trendingLimit)
    .populate('userId', 'name username profileImage isVerifiedHost role')
    .populate('linkedEventId', 'title date locationName price');

  // 4. Event cards — nearby if location provided, featured otherwise (more on cold start)
  const eventSlots = isColdStart ? 5 : EVENT_CARD_SLOTS;
  let eventCards: unknown[] = [];
  if (latitude !== undefined && longitude !== undefined) {
    const events = await Event.find({
      status: 'published',
      date: { $gte: new Date() },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: 50000, // 50km
        },
      },
    })
      .limit(eventSlots)
      .select('title images date startTime locationName price capacity bookedCount privacy hostId vibeTags isFeatured')
      .populate('hostId', 'name username profileImage isVerifiedHost');

    eventCards = events;
  } else if (isColdStart) {
    // No location but cold start — show featured/upcoming events
    const events = await Event.find({ status: 'published', date: { $gte: new Date() } })
      .sort({ isFeatured: -1, date: 1 })
      .limit(eventSlots)
      .select('title images date startTime locationName price capacity bookedCount privacy hostId vibeTags isFeatured')
      .populate('hostId', 'name username profileImage isVerifiedHost');
    eventCards = events;
  }

  // 5. Build feed items — interleave trending and event cards into followed posts
  const feedItems: FeedItem[] = [];
  const postItems: FeedItem[] = followedPosts.map((p) => ({ type: 'post', data: p }));
  const trendingItems: FeedItem[] = trendingPosts.map((p) => ({ type: 'post', data: p }));
  const eventItems: FeedItem[] = eventCards.map((e) => ({ type: 'event_card', data: e }));

  // Insert event card at position 4 and 10 if available, trending after every 5 followed posts
  for (let i = 0; i < postItems.length; i++) {
    feedItems.push(postItems[i]);

    if (i === 3 && eventItems.length > 0) feedItems.push(eventItems.shift()!);
    if (i === 9 && eventItems.length > 0) feedItems.push(eventItems.shift()!);
    if ((i + 1) % 5 === 0 && trendingItems.length > 0) feedItems.push(trendingItems.shift()!);
  }

  // If followed posts are sparse, pad with trending
  trendingItems.forEach((t) => feedItems.push(t));
  eventItems.forEach((e) => feedItems.push(e));

  // 6. Attach liked status for posts
  const postIds = feedItems.filter((f) => f.type === 'post').map((f) => (f.data as { _id: unknown })._id);
  const likedPosts = await Like.find({ userId, targetType: 'post', targetId: { $in: postIds } }).select('targetId');
  const likedSet = new Set(likedPosts.map((l) => l.targetId.toString()));

  const itemsWithMeta = feedItems.map((item) => {
    if (item.type === 'post') {
      const post = item.data as { _id: { toString: () => string } };
      return { ...item, liked: likedSet.has(post._id.toString()) };
    }
    return item;
  });

  // 7. Cursor = createdAt of last primary post (null on cold start — no pagination needed)
  const lastPost = followedPosts[followedPosts.length - 1];
  const nextCursor = !isColdStart && followedPosts.length === FEED_LIMIT && lastPost
    ? String(new Date(lastPost.createdAt).getTime())
    : null;

  return { items: itemsWithMeta, nextCursor };
}
