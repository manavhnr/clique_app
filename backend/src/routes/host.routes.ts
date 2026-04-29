import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadImage } from '../middleware/upload.middleware';
import { applyHostSchema, rejectHostSchema } from '../validators/host.validator';
import { apply, status, approve, reject, pending } from '../controllers/host.controller';

const router = Router();

router.use(authenticate);

// Any user — apply to become a host
router.post('/apply', uploadImage.fields([{ name: 'document', maxCount: 1 }, { name: 'selfie', maxCount: 1 }]), apply);
router.get('/status', status);

// Admin only
router.get('/pending', requireRole('admin'), pending);
router.patch('/:userId/approve', requireRole('admin'), approve);
router.patch('/:userId/reject', requireRole('admin'), validate(rejectHostSchema), reject);

export default router;
