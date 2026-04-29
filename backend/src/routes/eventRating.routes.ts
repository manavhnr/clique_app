import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createEventRatingSchema } from '../validators/eventRating.validator';
import { submitRating, listEventRatings } from '../controllers/eventRating.controller';

const router = Router();

router.post('/', authenticate, validate(createEventRatingSchema), submitRating);
router.get('/event/:eventId', authenticate, listEventRatings);

export default router;
