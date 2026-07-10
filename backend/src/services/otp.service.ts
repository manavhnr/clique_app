import twilio from 'twilio';

/** Normalize to E.164 (+91XXXXXXXXXX for bare 10-digit Indian numbers) */
function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (!phone.startsWith('+')) return `+${digits}`;
  return phone;
}

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)');
  }
  return twilio(accountSid, authToken);
}

function getServiceSid(): string {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid) throw new Error('TWILIO_VERIFY_SERVICE_SID not configured');
  return sid;
}

const isProduction = () => process.env.APP_ENV === 'production';

export async function sendOTP(phone: string): Promise<void> {
  if (!isProduction()) {
    console.log(`\n[OTP] ─────────────────────────`);
    console.log(`[OTP] Phone : ${phone}`);
    console.log(`[OTP] Code  : use any 6-digit code in dev (Twilio Verify bypassed)`);
    console.log(`[OTP] ─────────────────────────\n`);
    return;
  }

  const to = toE164(phone);
  await getTwilioClient()
    .verify.v2.services(getServiceSid())
    .verifications.create({ to, channel: 'sms' });
}

/**
 * Returns true if valid, false if wrong code.
 * Throws on Twilio errors (network, config, etc.).
 */
export async function verifyOTP(phone: string, otp: string): Promise<boolean> {
  if (!isProduction()) {
    // In dev, accept any 6-digit code so you can test without burning Twilio quota
    return /^\d{6}$/.test(otp);
  }

  const to = toE164(phone);
  const result = await getTwilioClient()
    .verify.v2.services(getServiceSid())
    .verificationChecks.create({ to, code: otp });

  return result.status === 'approved';
}
