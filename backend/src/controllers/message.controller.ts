import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import {
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markConversationRead,
  getTotalUnreadCount,
} from '../services/message.service';

const parsePage = (q: unknown) => Math.max(1, parseInt(String(q ?? 1)));
const parseLimit = (q: unknown) => Math.min(50, Math.max(1, parseInt(String(q ?? 30))));

export async function openConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const conversation = await getOrCreateConversation(req.user!.userId, req.body.recipientId);
    sendSuccess(res, { conversation });
  } catch (err) { next(err); }
}

export async function listConversations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const conversations = await getUserConversations(req.user!.userId);
    sendSuccess(res, { conversations });
  } catch (err) { next(err); }
}

export async function listMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const messages = await getConversationMessages(req.params.conversationId, req.user!.userId, page, limit);
    sendSuccess(res, { messages, page, limit });
  } catch (err) { next(err); }
}

export async function send(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const message = await sendMessage(req.params.conversationId, req.user!.userId, req.body.text);
    sendSuccess(res, { message }, 'Message sent', 201);
  } catch (err) { next(err); }
}

export async function markRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await markConversationRead(req.params.conversationId, req.user!.userId);
    sendSuccess(res, null, 'Marked as read');
  } catch (err) { next(err); }
}

export async function unreadCount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await getTotalUnreadCount(req.user!.userId);
    sendSuccess(res, { count });
  } catch (err) { next(err); }
}
