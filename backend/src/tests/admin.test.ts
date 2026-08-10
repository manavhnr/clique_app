import request from 'supertest';
import app from '../app';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/setup';
import { createUser, createAdmin, createHost, createEvent, makeToken } from './helpers/factory';
import { User } from '../models/User';
import { HostVerification } from '../models/HostVerification';
import { Payment } from '../models/Payment';
import { Booking } from '../models/Booking';
import { Pass } from '../models/Pass';

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(clearTestDB);

// ─── Access control ───────────────────────────────────────────────────────────

describe('Admin access control', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/v1/admin/stats');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const user = await createUser();
    const token = makeToken(user._id.toString());
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 403 for verified host (not admin)', async () => {
    const host = await createHost();
    const token = makeToken(host._id.toString(), 'host');
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ─── Dashboard stats ──────────────────────────────────────────────────────────

describe('Admin dashboard stats', () => {
  it('returns all required stat fields including pending counts', async () => {
    const admin = await createAdmin();
    const token = makeToken(admin._id.toString(), 'admin');

    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalUsers:      expect.any(Number),
      totalEvents:     expect.any(Number),
      openReports:     expect.any(Number),
      totalBookings:   expect.any(Number),
      pendingHosts:    expect.any(Number),
      pendingPayments: expect.any(Number),
    });
  });

  it('pendingHosts count reflects pending host verifications', async () => {
    const admin = await createAdmin();
    const user  = await createUser();
    const token = makeToken(admin._id.toString(), 'admin');

    await HostVerification.create({
      userId: user._id, documentType: 'aadhar',
      documentUrl: 'https://example.com/doc.jpg', address: '123 Test St', status: 'pending',
    });

    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pendingHosts).toBeGreaterThanOrEqual(1);
  });
});

// ─── Host verification workflow ───────────────────────────────────────────────

describe('Host verification workflow', () => {
  async function seedVerification(userId: string) {
    await HostVerification.create({
      userId, documentType: 'aadhar',
      documentUrl: 'https://example.com/doc.jpg', address: '123 Test St', status: 'pending',
    });
    await User.findByIdAndUpdate(userId, { hostVerificationStatus: 'pending' });
  }

  it('admin can list pending host applications', async () => {
    const admin = await createAdmin();
    const user  = await createUser();
    const token = makeToken(admin._id.toString(), 'admin');
    await seedVerification(user._id.toString());

    const res = await request(app)
      .get('/api/v1/admin/hosts/pending')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
  });

  it('approving sets role=host, isVerifiedHost=true, hostVerificationStatus=approved', async () => {
    const admin = await createAdmin();
    const user  = await createUser();
    const token = makeToken(admin._id.toString(), 'admin');
    await seedVerification(user._id.toString());

    const res = await request(app)
      .patch(`/api/v1/admin/hosts/${user._id}/approve`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const updated = await User.findById(user._id);
    expect(updated?.role).toBe('host');
    expect(updated?.isVerifiedHost).toBe(true);
    expect(updated?.hostVerificationStatus).toBe('approved');

    const verification = await HostVerification.findOne({ userId: user._id });
    expect(verification?.status).toBe('approved');
  });

  it('rejecting sets hostVerificationStatus=rejected and stores reason', async () => {
    const admin = await createAdmin();
    const user  = await createUser();
    const token = makeToken(admin._id.toString(), 'admin');
    await seedVerification(user._id.toString());

    const res = await request(app)
      .patch(`/api/v1/admin/hosts/${user._id}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rejectionReason: 'Document is blurry' });

    expect(res.status).toBe(200);

    const updated = await User.findById(user._id);
    expect(updated?.hostVerificationStatus).toBe('rejected');
    expect(updated?.role).not.toBe('host');

    const verification = await HostVerification.findOne({ userId: user._id });
    expect(verification?.status).toBe('rejected');
    expect(verification?.rejectionReason).toBe('Document is blurry');
  });

  it('approving a non-existent verification returns 404', async () => {
    const admin = await createAdmin();
    const user  = await createUser();
    const token = makeToken(admin._id.toString(), 'admin');

    const res = await request(app)
      .patch(`/api/v1/admin/hosts/${user._id}/approve`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('double-approving an already approved host returns 409', async () => {
    const admin = await createAdmin();
    const user  = await createUser();
    const token = makeToken(admin._id.toString(), 'admin');
    await HostVerification.create({
      userId: user._id, documentType: 'aadhar',
      documentUrl: 'https://example.com/doc.jpg', address: '123 Test St', status: 'approved',
    });

    const res = await request(app)
      .patch(`/api/v1/admin/hosts/${user._id}/approve`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
  });
});

// ─── UPI payment verification workflow ───────────────────────────────────────

describe('UPI payment verification workflow', () => {
  async function seedPendingPayment() {
    const host  = await createHost();
    const user  = await createUser();
    const event = await createEvent(host._id.toString(), { price: 500 });

    const booking = await Booking.create({
      userId: user._id, eventId: event._id, hostId: host._id,
      status: 'payment_pending', amount: 500,
    });

    const payment = await Payment.create({
      bookingId: booking._id, userId: user._id, eventId: event._id,
      paymentMethod: 'upi', utrNumber: 'TEST123456789',
      transactionProofUrl: 'https://example.com/proof.jpg',
      amount: 50000, currency: 'INR', status: 'pending_verification',
    });

    return { user, event, booking, payment };
  }

  it('non-admin cannot verify a payment', async () => {
    const user  = await createUser();
    const token = makeToken(user._id.toString());

    const res = await request(app)
      .patch('/api/v1/payments/507f1f77bcf86cd799439011/verify')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('verifying a UPI payment sets it to paid and confirms the booking', async () => {
    const admin = await createAdmin();
    const token = makeToken(admin._id.toString(), 'admin');
    const { payment, booking } = await seedPendingPayment();

    const res = await request(app)
      .patch(`/api/v1/payments/${payment._id}/verify`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const updatedPayment = await Payment.findById(payment._id);
    expect(updatedPayment?.status).toBe('paid');
    expect(updatedPayment?.verifiedBy?.toString()).toBe(admin._id.toString());

    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking?.status).toBe('confirmed');
  });

  it('verifying a UPI payment generates an active pass', async () => {
    const admin = await createAdmin();
    const token = makeToken(admin._id.toString(), 'admin');
    const { payment, booking } = await seedPendingPayment();

    await request(app)
      .patch(`/api/v1/payments/${payment._id}/verify`)
      .set('Authorization', `Bearer ${token}`);

    const pass = await Pass.findOne({ bookingId: booking._id });
    expect(pass).not.toBeNull();
    expect(pass?.status).toBe('active');
    expect(pass?.qrTokenHash).toBeTruthy();
  });

  it('rejecting a UPI payment sets it to failed and leaves booking unchanged', async () => {
    const admin = await createAdmin();
    const token = makeToken(admin._id.toString(), 'admin');
    const { payment, booking } = await seedPendingPayment();

    const res = await request(app)
      .patch(`/api/v1/payments/${payment._id}/reject`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const updatedPayment = await Payment.findById(payment._id);
    expect(updatedPayment?.status).toBe('failed');

    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking?.status).toBe('payment_pending');

    const pass = await Pass.findOne({ bookingId: booking._id });
    expect(pass).toBeNull();
  });

  it('admin can list pending UPI payments', async () => {
    const admin = await createAdmin();
    const token = makeToken(admin._id.toString(), 'admin');
    await seedPendingPayment();

    const res = await request(app)
      .get('/api/v1/payments/pending')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.payments)).toBe(true);
    expect(res.body.data.payments.length).toBeGreaterThanOrEqual(1);
  });

  it('attempting to verify a non-pending payment returns 400', async () => {
    const admin = await createAdmin();
    const host  = await createHost();
    const user  = await createUser();
    const token = makeToken(admin._id.toString(), 'admin');

    const event   = await createEvent(host._id.toString(), { price: 200 });
    const booking = await Booking.create({
      userId: user._id, eventId: event._id, hostId: host._id,
      status: 'payment_pending', amount: 200,
    });
    const payment = await Payment.create({
      bookingId: booking._id, userId: user._id, eventId: event._id,
      paymentMethod: 'upi', amount: 20000, currency: 'INR', status: 'paid',
    });

    const res = await request(app)
      .patch(`/api/v1/payments/${payment._id}/verify`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

// ─── Admin config (compliance content) ───────────────────────────────────────

describe('Admin config', () => {
  it('returns empty config when nothing is set', async () => {
    const admin = await createAdmin();
    const token = makeToken(admin._id.toString(), 'admin');

    const res = await request(app)
      .get('/api/v1/admin/config')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.data).toBe('object');
  });

  it('admin can set and retrieve a config value', async () => {
    const admin = await createAdmin();
    const token = makeToken(admin._id.toString(), 'admin');

    await request(app)
      .put('/api/v1/admin/config')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'about', value: 'Clique is a social nightlife platform.' });

    const res = await request(app)
      .get('/api/v1/admin/config')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.about).toBe('Clique is a social nightlife platform.');
  });

  it('admin can overwrite an existing config value', async () => {
    const admin = await createAdmin();
    const token = makeToken(admin._id.toString(), 'admin');

    await request(app)
      .put('/api/v1/admin/config')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'flow_of_funds', value: 'v1 text' });

    await request(app)
      .put('/api/v1/admin/config')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'flow_of_funds', value: 'v2 text' });

    const res = await request(app)
      .get('/api/v1/admin/config')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data.flow_of_funds).toBe('v2 text');
  });

  it('rejects missing key or value', async () => {
    const admin = await createAdmin();
    const token = makeToken(admin._id.toString(), 'admin');

    const res = await request(app)
      .put('/api/v1/admin/config')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'about' }); // missing value

    expect(res.status).toBe(400);
  });

  it('non-admin cannot update config', async () => {
    const user  = await createUser();
    const token = makeToken(user._id.toString());

    const res = await request(app)
      .put('/api/v1/admin/config')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'about', value: 'hack' });

    expect(res.status).toBe(403);
  });
});
