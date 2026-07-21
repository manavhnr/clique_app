import { Router } from 'express';
import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createOrderSchema, verifyPaymentSchema, submitUPISchema } from '../validators/payment.validator';
import {
  createPaymentOrder, verifyPaymentHandler, webhookHandler,
  submitUPIHandler, adminVerifyPaymentHandler, adminRejectPaymentHandler, listPendingPaymentsHandler,
  uploadProofHandler,
} from '../controllers/payment.controller';
import { uploadImage } from '../middleware/upload.middleware';

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
router.post('/upload-proof', uploadImage.single('proof'), uploadProofHandler);
router.post('/upi-submit', validate(submitUPISchema), submitUPIHandler);

// Admin: list and verify UPI payments
router.get('/pending', requireRole('admin'), listPendingPaymentsHandler);
router.patch('/:paymentId/verify', requireRole('admin'), adminVerifyPaymentHandler);
router.patch('/:paymentId/reject', requireRole('admin'), adminRejectPaymentHandler);

export default router;
