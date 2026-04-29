import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createRequestSchema, rejectRequestSchema } from '../validators/request.validator';
import { create, hostRequests, approve, reject, status } from '../controllers/request.controller';

const router = Router();

router.use(authenticate);

router.post('/', validate(createRequestSchema), create);
router.get('/host', hostRequests);
router.get('/status/:eventId', status);
router.patch('/:requestId/approve', approve);
router.patch('/:requestId/reject', validate(rejectRequestSchema), reject);

export default router;
