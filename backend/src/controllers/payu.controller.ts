import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { User } from '../models/User';
import {
  generateOnboardingLink,
  verifyPayUWebhookSignature,
  processPayUWebhook,
} from '../services/payu.service';

export async function generateOnboardingLinkHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId).select('email phone payoutStatus');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (user.payoutStatus === 'active') {
      res.status(400).json({ success: false, message: 'Payouts are already active on this account' });
      return;
    }

    const redirectUrl = await generateOnboardingLink(
      String(user._id),
      user.email ?? '',
      user.phone,
    );

    // Mark pending immediately so dashboard reflects in-progress state
    await User.findByIdAndUpdate(user._id, { payoutStatus: 'pending' });

    res.json({ success: true, data: { redirect_url: redirectUrl } });
  } catch (err) {
    next(err);
  }
}

export async function payuWebhookHandler(req: Request, res: Response): Promise<void> {
  // x-payu-signature: HMAC-SHA256 hex of the raw JSON body
  // Verify exact header name against your PayU partner integration docs
  const signature = req.headers['x-payu-signature'] as string | undefined;

  if (!signature || !verifyPayUWebhookSignature(req.body as Buffer, signature)) {
    res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    return;
  }

  // Respond 200 immediately — PayU will retry on any non-2xx response
  res.status(200).json({ received: true });

  // Parse and process after the response is queued to flush
  let payload: unknown;
  try {
    payload = JSON.parse((req.body as Buffer).toString('utf-8'));
  } catch {
    return; // malformed body — already 200'd, nothing more to do
  }

  setImmediate(async () => {
    try {
      await processPayUWebhook(payload as Parameters<typeof processPayUWebhook>[0]);
    } catch {
      // DB update failed — PayU won't retry (we already sent 200), log externally if needed
    }
  });
}
