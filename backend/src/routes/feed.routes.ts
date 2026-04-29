import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { homeFeed } from '../controllers/feed.controller';

const router = Router();

router.use(authenticate);

router.get('/', homeFeed);

export default router;
