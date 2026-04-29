import { Router } from 'express';
import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createOrderSchema, verifyPaymentSchema } from '../validators/payment.validator';
import { createPaymentOrder, verifyPaymentHandler, webhookHandler } from '../controllers/payment.controller';

const router = Router();

// Webhook must receive raw body for signature verification — mount before json middleware
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  webhookHandler
);

router.use(authenticate);

router.post('/create-order', validate(createOrderSchema), createPaymentOrder);
router.post('/verify', validate(verifyPaymentSchema), verifyPaymentHandler);

export default router;
