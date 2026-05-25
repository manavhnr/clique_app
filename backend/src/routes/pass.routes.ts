import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireVerifiedHost, requireScanPermission } from '../middleware/role.middleware';
import { myPasses, getPass, scan, verify } from '../controllers/pass.controller';

const router = Router();

router.use(authenticate);

router.get('/my', myPasses);
router.get('/:passId', getPass);

// Verify — read-only preview, no check-in (host only)
router.post('/verify', requireVerifiedHost, verify);

// Scan — verified hosts OR event-level scanners
router.post('/scan', requireScanPermission, scan);

export default router;
