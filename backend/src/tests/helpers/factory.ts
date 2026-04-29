import jwt from 'jsonwebtoken';
import { User } from '../../models/User';
import { Event } from '../../models/Event';
import { Booking } from '../../models/Booking';
import { Pass } from '../../models/Pass';
import crypto from 'crypto';
import QRCode from 'qrcode';

process.env.JWT_SECRET = 'test_secret';
process.env.OTP_PROVIDER = 'mock';

export function makeToken(userId: string, role: 'attendee' | 'host' | 'admin' = 'attendee'): string {
  return jwt.sign({ userId, role }, 'test_secret', { expiresIn: '1d' });
}

export async function createUser(overrides: Partial<{
  name: string; username: string; phone: string;
  role: 'attendee' | 'host' | 'admin'; isVerifiedHost: boolean; isBanned: boolean;
}> = {}) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return User.create({
    name: overrides.name ?? `Test User ${suffix}`,
    username: overrides.username ?? `user_${suffix}`,
    phone: overrides.phone ?? `+91${Math.floor(9000000000 + Math.random() * 999999999)}`,
    role: overrides.role ?? 'attendee',
    isVerifiedHost: overrides.isVerifiedHost ?? false,
    isBanned: overrides.isBanned ?? false,
  });
}

export async function createHost() {
  return createUser({ role: 'host', isVerifiedHost: true });
}

export async function createAdmin() {
  return createUser({ role: 'admin' });
}

export async function createEvent(hostId: string, overrides: Partial<{
  status: string; price: number; capacity: number;
  privacy: string; approvalRequired: boolean;
}> = {}) {
  return Event.create({
    hostId,
    title: 'Test Event',
    description: 'A test event description for testing purposes',
    category: 'club',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    startTime: '20:00',
    endTime: '23:00',
    locationName: 'Test Venue',
    address: '123 Test Street',
    location: { type: 'Point', coordinates: [80.2707, 13.0827] },
    price: overrides.price ?? 0,
    capacity: overrides.capacity ?? 10,
    privacy: overrides.privacy ?? 'public',
    approvalRequired: overrides.approvalRequired ?? false,
    status: overrides.status ?? 'published',
  });
}

export async function createBookingAndPass(userId: string, eventId: string, hostId: string) {
  const booking = await Booking.create({
    userId, eventId, hostId, status: 'confirmed', amount: 0,
  });

  const qrPayload = jwt.sign(
    { passId: 'temp', eventId: eventId.toString(), userId },
    'test_secret',
    { expiresIn: '365d' }
  );
  const qrTokenHash = crypto.createHash('sha256').update(qrPayload).digest('hex');
  const qrCodeUrl = await QRCode.toDataURL(qrPayload);

  const tempPass = await Pass.create({
    bookingId: booking._id, userId, eventId,
    qrTokenHash: crypto.randomBytes(16).toString('hex'), status: 'active',
  });

  const finalQrPayload = jwt.sign(
    { passId: tempPass._id.toString(), eventId: eventId.toString(), userId },
    'test_secret',
    { expiresIn: '365d' }
  );
  const finalHash = crypto.createHash('sha256').update(finalQrPayload).digest('hex');
  const finalQrUrl = await QRCode.toDataURL(finalQrPayload);

  await Pass.findByIdAndUpdate(tempPass._id, { qrTokenHash: finalHash, qrCodeUrl: finalQrUrl });
  await Booking.findByIdAndUpdate(booking._id, { passId: tempPass._id });

  return { booking, pass: tempPass, qrToken: finalQrPayload };
}
