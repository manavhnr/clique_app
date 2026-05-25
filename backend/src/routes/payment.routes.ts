import { Router } from 'express';
import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createOrderSchema, verifyPaymentSchema } from '../validators/payment.validator';
import { createPaymentOrder, verifyPaymentHandler, webhookHandler } from '../controllers/payment.controller';

const router = Router();

// Webhook needs raw Buffer for HMAC signature verification — must come before express.json()
router.post('/webhook', express.raw({ type: 'application/json' }), webhookHandler);

// All other payment routes need JSON body parsing.
// The payment router is mounted before the global express.json() in app.ts (to protect the
// webhook raw body), so we apply it here for the remaining routes.
router.use(express.json());
router.use(authenticate);

router.post('/create-order', validate(createOrderSchema), createPaymentOrder);
router.post('/verify', validate(verifyPaymentSchema), verifyPaymentHandler);

export default router;
