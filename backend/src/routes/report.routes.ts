import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createReportSchema } from '../validators/report.validator';
import { submitReport } from '../controllers/report.controller';

const router = Router();

router.post('/', authenticate, validate(createReportSchema), submitReport);

export default router;
