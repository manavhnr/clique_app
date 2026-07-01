import { Router } from 'express';
import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireVerifiedHost } from '../middleware/role.middleware';
import { generateOnboardingLinkHandler, payuWebhookHandler } from '../controllers/payu.controller';

const router = Router();

// Webhook receives raw body so we can HMAC-verify the signature — must come before express.json()
router.post('/webhook', express.raw({ type: 'application/json' }), payuWebhookHandler);

// Remaining routes use JSON body parsing + auth
router.use(express.json());
router.use(authenticate);

router.post('/generate-onboarding-link', requireVerifiedHost, generateOnboardingLinkHandler);

export default router;
