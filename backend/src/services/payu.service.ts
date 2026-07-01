import crypto from 'crypto';
import { User } from '../models/User';
import { createError } from '../middleware/error.middleware';
import { writeAuditLog } from '../utils/auditLog';

const isSandbox = process.env.PAYU_SANDBOX !== 'false';

// PayU India Aggregator API base URLs — update paths to match your PayU contract docs
const PAYU_AUTH_URL = isSandbox
  ? 'https://accounts-sandbox.payu.in/oauth/token'
  : 'https://accounts.payu.in/oauth/token';

const PAYU_ONBOARDING_URL = isSandbox
  ? 'https://partner-sandbox.payu.in/v1/aggregator/merchants/onboarding'
  : 'https://partner.payu.in/v1/aggregator/merchants/onboarding';

async function fetchPayUToken(): Promise<string> {
  const clientId     = process.env.PAYU_CLIENT_ID;
  const clientSecret = process.env.PAYU_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw createError('PayU credentials not configured', 500);

  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     clientId,
    client_secret: clientSecret,
    scope:         'merchant_onboarding',
  });

  const res = await fetch(PAYU_AUTH_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw createError(`PayU auth failed: ${res.status} ${text}`, 502);
  }

  const data = await res.json() as { access_token?: string };
  if (!data.access_token) throw createError('PayU did not return an access token', 502);
  return data.access_token;
}

export async function generateOnboardingLink(
  userId: string,
  email: string,
  phone: string,
): Promise<string> {
  const token  = await fetchPayUToken();
  const appUrl = process.env.APP_URL ?? 'https://clique.com';

  const res = await fetch(PAYU_ONBOARDING_URL, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      phone,
      reference_id: userId,            // lets us match the webhook back to our user
      return_url:   `${appUrl}/host/dashboard?status=pending`,
      webhook_url:  `${appUrl}/api/v1/payu/webhook`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw createError(`PayU onboarding init failed: ${res.status} ${text}`, 502);
  }

  const data = await res.json() as { data?: { redirect_url?: string } };
  const redirectUrl = data?.data?.redirect_url;
  if (!redirectUrl) throw createError('PayU did not return a redirect URL', 502);

  await writeAuditLog({
    actorId:    userId,
    action:     'PAYU_ONBOARDING_LINK_GENERATED',
    targetType: 'User',
    targetId:   userId,
  });

  return redirectUrl;
}

// PayU sends the HMAC-SHA256 hex digest of the raw JSON body in the x-payu-signature header.
// Verify that header name against your PayU partner docs — some integrations use x-verify.
export function verifyPayUWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const secret = process.env.PAYU_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  // timingSafeEqual requires equal-length buffers
  const expectedBuf = Buffer.from(expected, 'utf-8');
  const sigBuf      = Buffer.from(signature, 'utf-8');
  if (expectedBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, sigBuf);
}

interface PayUWebhookPayload {
  event_type: string;
  data: {
    reference_id?:       string;
    child_merchant_id?:  string;
    merchant_id?:        string;
    status?:             string;
  };
}

const SUCCESS_EVENTS  = ['account_status_updated', 'kyc_approved', 'merchant_activated'];
const REJECTED_EVENTS = ['kyc_rejected', 'account_rejected'];

export async function processPayUWebhook(payload: PayUWebhookPayload): Promise<void> {
  const { event_type, data } = payload;

  if (!SUCCESS_EVENTS.includes(event_type) && !REJECTED_EVENTS.includes(event_type)) return;

  const userId         = data.reference_id;
  const payuMerchantId = data.child_merchant_id ?? data.merchant_id;

  if (!userId) return;

  if (SUCCESS_EVENTS.includes(event_type)) {
    await User.findByIdAndUpdate(userId, {
      payoutStatus: 'active',
      ...(payuMerchantId ? { payuMerchantId } : {}),
    });
    await writeAuditLog({
      actorId:    userId,
      action:     'PAYU_KYC_APPROVED',
      targetType: 'User',
      targetId:   userId,
      metadata:   { event_type, payuMerchantId },
    });
  } else {
    await User.findByIdAndUpdate(userId, { payoutStatus: 'rejected' });
    await writeAuditLog({
      actorId:    userId,
      action:     'PAYU_KYC_REJECTED',
      targetType: 'User',
      targetId:   userId,
      metadata:   { event_type },
    });
  }
}
