import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireVerifiedHost } from '../middleware/role.middleware';
import { myPasses, getPass, scan } from '../controllers/pass.controller';

const router = Router();

router.use(authenticate);

router.get('/my', myPasses);
router.get('/:passId', getPass);

// Scan — verified host or scanner only
router.post('/scan', requireVerifiedHost, scan);

export default router;
