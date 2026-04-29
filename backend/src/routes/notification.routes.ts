import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { registerTokenSchema } from '../validators/notification.validator';
import { registerToken, list, read, readAll } from '../controllers/notification.controller';

const router = Router();

router.use(authenticate);

router.post('/register-token', validate(registerTokenSchema), registerToken);
router.get('/', list);
router.patch('/read-all', readAll);
router.patch('/:notificationId/read', read);

export default router;
