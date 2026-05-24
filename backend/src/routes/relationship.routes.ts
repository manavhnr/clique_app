import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  follow,
  unfollow,
  block,
  unblock,
  followers,
  following,
  mutuals,
  blocked,
  relationshipStatus,
} from '../controllers/relationship.controller';

const router = Router();

router.use(authenticate);

router.post('/follow/:userId', follow);
router.delete('/follow/:userId', unfollow);
router.post('/block/:userId', block);
router.delete('/block/:userId', unblock);
router.get('/followers/:userId', followers);
router.get('/following/:userId', following);
router.get('/mutuals/:userId', mutuals);
router.get('/blocked', blocked);
router.get('/status/:userId', relationshipStatus);

export default router;
