import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { Like } from '../models/Like';
import { User } from '../models/User';
import { createError } from '../middleware/error.middleware';
import { incrementPostEngagement } from './cliquescore.service';
import { notifyPostLiked, notifyPostCommented } from './notification.service';
import mongoose from 'mongoose';
import { z } from 'zod';
import { createPostSchema, createCommentSchema } from '../validators/post.validator';

type CreatePostInput = z.infer<typeof createPostSchema>;
type CreateCommentInput = z.infer<typeof createCommentSchema>;

export async function createPost(userId: string, data: CreatePostInput, mediaUrls: string[]) {
  const post = await Post.create({
    userId,
    text: data.text,
    mediaUrls,
    mediaType: mediaUrls.length > 0 ? data.mediaType : 'none',
    linkedEventId: data.linkedEventId,
    location: data.location,
    visibility: data.visibility,
  });

  await User.findByIdAndUpdate(userId, { $inc: { postCount: 1 } });
  return post;
}

export async function getPostById(postId: string, requesterId: string) {
  const post = await Post.findById(postId)
    .populate('userId', 'name username profileImage isVerifiedHost')
    .populate('linkedEventId', 'title date location');

  if (!post || post.status === 'removed') throw createError('Post not found', 404);

  const liked = await Like.findOne({ userId: requesterId, targetType: 'post', targetId: postId });
  return { post, liked: !!liked };
}

export async function deletePost(postId: string, requesterId: string, role: string) {
  const post = await Post.findById(postId);
  if (!post || post.status === 'removed') throw createError('Post not found', 404);

  const isOwner = post.userId.toString() === requesterId;
  const isAdmin = role === 'admin';
  if (!isOwner && !isAdmin) throw createError('Forbidden', 403);

  await Post.findByIdAndUpdate(postId, { status: 'removed' });
  if (isOwner) await User.findByIdAndUpdate(requesterId, { $inc: { postCount: -1 } });
}

export async function likePost(postId: string, userId: string) {
  const post = await Post.findById(postId);
  if (!post || post.status !== 'active') throw createError('Post not found', 404);

  await Like.create({ userId, targetType: 'post', targetId: postId });
  await Post.findByIdAndUpdate(postId, { $inc: { likeCount: 1 } });

  if (post.userId.toString() !== userId) {
    const liker = await User.findById(userId).select('name');
    await incrementPostEngagement(post.userId.toString(), 1, 0, 0);
    void notifyPostLiked(post.userId.toString(), liker?.name || 'Someone');
  }
}

export async function unlikePost(postId: string, userId: string) {
  const result = await Like.findOneAndDelete({ userId, targetType: 'post', targetId: postId });
  if (!result) throw createError('Not liked', 404);
  await Post.findByIdAndUpdate(postId, { $inc: { likeCount: -1 } });
}

export async function addComment(postId: string, userId: string, data: CreateCommentInput) {
  const post = await Post.findById(postId);
  if (!post || post.status !== 'active') throw createError('Post not found', 404);

  if (data.parentCommentId) {
    const parent = await Comment.findById(data.parentCommentId);
    if (!parent || parent.postId.toString() !== postId) throw createError('Parent comment not found', 404);
  }

  const comment = await Comment.create({
    postId,
    userId,
    text: data.text,
    parentCommentId: data.parentCommentId
      ? new mongoose.Types.ObjectId(data.parentCommentId)
      : undefined,
  });

  await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

  if (post.userId.toString() !== userId) {
    const commenter = await User.findById(userId).select('name');
    await incrementPostEngagement(post.userId.toString(), 0, 1, 0);
    void notifyPostCommented(post.userId.toString(), commenter?.name || 'Someone', postId);
  }

  return comment;
}

export async function getComments(postId: string, page: number, limit: number) {
  const post = await Post.findById(postId);
  if (!post || post.status === 'removed') throw createError('Post not found', 404);

  const comments = await Comment.find({ postId, status: 'active', parentCommentId: { $exists: false } })
    .populate('userId', 'name username profileImage')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return comments;
}
