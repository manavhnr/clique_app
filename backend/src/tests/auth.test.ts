import request from 'supertest';
import app from '../app';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/setup';
import { createUser, makeToken } from './helpers/factory';

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(clearTestDB);

describe('Auth', () => {
  it('POST /auth/send-otp — sends OTP for valid phone', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+919999999999' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /auth/send-otp — rejects invalid phone', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '123' });
    expect(res.status).toBe(400);
  });

  it('GET /auth/me — returns user for valid token', async () => {
    const user = await createUser();
    const token = makeToken(user._id.toString());
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(user.username);
  });

  it('GET /auth/me — rejects missing token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me — rejects banned user', async () => {
    const user = await createUser({ isBanned: true });
    const token = makeToken(user._id.toString());
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
