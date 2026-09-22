import twilio from 'twilio';
import bcrypt from 'bcrypt';
import { OTP } from '../models/OTP';

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (!phone.startsWith('+')) return `+${digits}`;
  return phone;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }
  return twilio(accountSid, authToken);
}

const isProduction = () => process.env.APP_ENV === 'production';

export async function sendOTP(phone: string): Promise<void> {
  const code = generateOTP();

  if (!isProduction()) {
    console.log(`\n[OTP] ─────────────────────────`);
    console.log(`[OTP] Phone : ${phone}`);
    console.log(`[OTP] Code  : ${code}`);
    console.log(`[OTP] ─────────────────────────\n`);
  } else {
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) throw new Error('TWILIO_PHONE_NUMBER not configured');

    await getTwilioClient().messages.create({
      to: toE164(phone),
      from: fromNumber,
      body: `Your Clique verification code is ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this with anyone.`,
    });
  }

  const otpHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await OTP.findOneAndUpdate(
    { phone },
    { otpHash, attempts: 0, expiresAt },
    { upsert: true, new: true }
  );
}

export async function verifyOTP(phone: string, otp: string): Promise<boolean> {
  if (!isProduction()) {
    return /^\d{6}$/.test(otp);
  }

  const record = await OTP.findOne({ phone });

  if (!record) return false;
  if (record.expiresAt < new Date()) {
    await OTP.deleteOne({ phone });
    return false;
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await OTP.deleteOne({ phone });
    return false;
  }

  const match = await bcrypt.compare(otp, record.otpHash);

  if (!match) {
    await OTP.updateOne({ phone }, { $inc: { attempts: 1 } });
    return false;
  }

  await OTP.deleteOne({ phone });
  return true;
}
