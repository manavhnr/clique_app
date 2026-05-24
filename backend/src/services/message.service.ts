import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Relationship } from '../models/Relationship';
import { User } from '../models/User';
import { createError } from '../middleware/error.middleware';

async function isBlocked(userId: string, otherId: string): Promise<boolean> {
  const block = await Relationship.findOne({
    $or: [
      { requesterId: userId, receiverId: otherId, type: 'block' },
      { requesterId: otherId, receiverId: userId, type: 'block' },
    ],
  });
  return !!block;
}

export async function getOrCreateConversation(currentUserId: string, recipientId: string) {
  if (currentUserId === recipientId) throw createError('Cannot message yourself', 400);

  const recipient = await User.findById(recipientId).select('_id name username profileImage isBanned');
  if (!recipient || recipient.isBanned) throw createError('User not found', 404);

  if (await isBlocked(currentUserId, recipientId)) {
    throw createError('Cannot send messages to this user', 403);
  }

  const existing = await Conversation.findOne({
    participants: { $all: [currentUserId, recipientId], $size: 2 },
  }).populate('participants', 'name username profileImage');

  if (existing) return existing;

  const conversation = await Conversation.create({
    participants: [currentUserId, recipientId],
    lastMessage: null,
    unreadFor: [],
  });

  return Conversation.findById(conversation._id).populate('participants', 'name username profileImage');
}

export async function getUserConversations(userId: string) {
  const conversations = await Conversation.find({ participants: userId })
    .sort({ updatedAt: -1 })
    .populate('participants', 'name username profileImage')
    .lean();

  return conversations.map((c) => ({
    ...c,
    otherUser: (c.participants as any[]).find((p: any) => p._id.toString() !== userId),
    hasUnread: (c.unreadFor as any[]).some((id: any) => id.toString() === userId),
  }));
}

export async function getConversationMessages(
  conversationId: string,
  userId: string,
  page: number,
  limit: number
) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw createError('Conversation not found', 404);

  const isParticipant = conversation.participants.some((p) => p.toString() === userId);
  if (!isParticipant) throw createError('Not authorised', 403);

  const messages = await Message.find({ conversationId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return messages.reverse();
}

export async function sendMessage(conversationId: string, senderId: string, text: string) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw createError('Conversation not found', 404);

  const isParticipant = conversation.participants.some((p) => p.toString() === senderId);
  if (!isParticipant) throw createError('Not authorised', 403);

  const recipientId = conversation.participants.find((p) => p.toString() !== senderId);
  if (!recipientId) throw createError('Conversation invalid', 500);

  if (await isBlocked(senderId, recipientId.toString())) {
    throw createError('Cannot send messages to this user', 403);
  }

  const message = await Message.create({ conversationId, senderId, text });

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: { text, senderId, createdAt: message.createdAt },
    $addToSet: { unreadFor: recipientId },
    updatedAt: new Date(),
  });

  return message;
}

export async function markConversationRead(conversationId: string, userId: string) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw createError('Conversation not found', 404);

  const isParticipant = conversation.participants.some((p) => p.toString() === userId);
  if (!isParticipant) throw createError('Not authorised', 403);

  await Conversation.findByIdAndUpdate(conversationId, {
    $pull: { unreadFor: new mongoose.Types.ObjectId(userId) },
  });
}

export async function getTotalUnreadCount(userId: string): Promise<number> {
  return Conversation.countDocuments({ participants: userId, unreadFor: userId });
}
