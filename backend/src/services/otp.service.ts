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
    await sendViaMSG91(phone, otp);
  } else {
    console.log(`\n[OTP] ─────────────────────────`);
    console.log(`[OTP] Phone : ${phone}`);
    console.log(`[OTP] Code  : ${otp}`);
    console.log(`[OTP] ─────────────────────────\n`);
  }
}

/** Convert any phone format → MSG91 format (country code + digits, no +) */
function toMSG91Mobile(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;                     // bare 10-digit Indian
  if (digits.length === 12 && digits.startsWith('91')) return digits; // already 91XXXXXXXXXX
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(1); // 091…
  return digits; // pass through for other country codes
}

async function sendViaMSG91(phone: string, otp: string): Promise<void> {
  const authKey    = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey || !templateId) {
    throw new Error('MSG91 credentials not configured (MSG91_AUTH_KEY, MSG91_TEMPLATE_ID)');
  }

  const mobile = toMSG91Mobile(phone);

  const url = new URL('https://control.msg91.com/api/v5/otp');
  url.searchParams.set('template_id', templateId);
  url.searchParams.set('mobile', mobile);
  url.searchParams.set('otp', otp);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      authkey: authKey,
      'content-type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`MSG91 OTP send failed (${response.status}): ${body}`);
  }
}
