import crypto from 'crypto';

export function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export async function sendOTP(phone: string, otp: string): Promise<void> {
  const isProduction = process.env.APP_ENV === 'production';

  if (isProduction) {
    await sendViaTwilio(phone, otp);
  } else {
    console.log(`\n[OTP] ─────────────────────────`);
    console.log(`[OTP] Phone : ${phone}`);
    console.log(`[OTP] Code  : ${otp}`);
    console.log(`[OTP] ─────────────────────────\n`);
  }
}

async function sendViaTwilio(phone: string, otp: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio credentials not configured');
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const twilio = require('twilio') as (sid: string, token: string) => { messages: { create: (opts: Record<string, string>) => Promise<void> } };
  const client = twilio(accountSid, authToken);

  await client.messages.create({
    body: `Your Clique OTP is ${otp}. Valid for 10 minutes.`,
    from,
    to: phone,
  });
}
