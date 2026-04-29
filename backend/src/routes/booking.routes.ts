import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createBookingSchema } from '../validators/booking.validator';
import { create, myBookings, cancel } from '../controllers/booking.controller';

const router = Router();

router.use(authenticate);

router.post('/', validate(createBookingSchema), create);
router.get('/my', myBookings);
router.patch('/:bookingId/cancel', cancel);

export default router;
