import request from 'supertest';
import app from '../app';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/setup';
import { createUser, createAdmin, makeToken } from './helpers/factory';

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(clearTestDB);

describe('Host Verification', () => {
  it('unverified host cannot create events', async () => {
    const user = await createUser();
    const token = makeToken(user._id.toString());
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test' });
    expect(res.status).toBe(403);
  });

  it('admin can view pending verifications', async () => {
    const admin = await createAdmin();
    const token = makeToken(admin._id.toString(), 'admin');
    const res = await request(app)
      .get('/api/v1/hosts/pending')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('non-admin cannot view pending verifications', async () => {
    const user = await createUser();
    const token = makeToken(user._id.toString());
    const res = await request(app)
      .get('/api/v1/hosts/pending')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('admin can approve host', async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const adminToken = makeToken(admin._id.toString(), 'admin');

    const { User } = await import('../models/User');
    await User.findByIdAndUpdate(user._id, { hostVerificationStatus: 'pending' });
    const { HostVerification } = await import('../models/HostVerification');
    await HostVerification.create({
      userId: user._id, documentType: 'aadhar',
      documentUrl: '/uploads/test.jpg', address: '123 Test Street', status: 'pending',
    });

    const res = await request(app)
      .patch(`/api/v1/hosts/${user._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const updated = await User.findById(user._id);
    expect(updated?.isVerifiedHost).toBe(true);
    expect(updated?.role).toBe('host');
  });
});
