import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  openConversation,
  listConversations,
  listMessages,
  send,
  markRead,
  unreadCount,
} from '../controllers/message.controller';

const router = Router();
router.use(authenticate);

const openSchema = z.object({ recipientId: z.string().min(1) });
const sendSchema = z.object({ text: z.string().min(1).max(2000) });

router.post('/open', validate(openSchema), openConversation);
router.get('/conversations', listConversations);
router.get('/conversations/:conversationId', listMessages);
router.post('/conversations/:conversationId', validate(sendSchema), send);
router.patch('/conversations/:conversationId/read', markRead);
router.get('/unread-count', unreadCount);

export default router;
