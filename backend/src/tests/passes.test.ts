import request from 'supertest';
import app from '../app';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/setup';
import { createUser, createHost, createEvent, createBookingAndPass, makeToken } from './helpers/factory';

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(clearTestDB);

describe('QR Pass + Scanner', () => {
  it('get my passes returns correct pass', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString());
    const user = await createUser();
    await createBookingAndPass(user._id.toString(), event._id.toString(), host._id.toString());
    const token = makeToken(user._id.toString());

    const res = await request(app)
      .get('/api/v1/passes/my')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.upcoming).toHaveLength(1);
  });

  it('host can scan valid QR and check in guest', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString());
    const user = await createUser();
    const { qrToken } = await createBookingAndPass(user._id.toString(), event._id.toString(), host._id.toString());
    const token = makeToken(host._id.toString(), 'host');

    const res = await request(app)
      .post('/api/v1/passes/scan')
      .set('Authorization', `Bearer ${token}`)
      .send({ qrToken, eventId: event._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);
    expect(res.body.data.guest).toBeDefined();
  });

  it('rejects duplicate QR scan', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString());
    const user = await createUser();
    const { qrToken } = await createBookingAndPass(user._id.toString(), event._id.toString(), host._id.toString());
    const token = makeToken(host._id.toString(), 'host');

    await request(app)
      .post('/api/v1/passes/scan')
      .set('Authorization', `Bearer ${token}`)
      .send({ qrToken, eventId: event._id.toString() });

    const res = await request(app)
      .post('/api/v1/passes/scan')
      .set('Authorization', `Bearer ${token}`)
      .send({ qrToken, eventId: event._id.toString() });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already used/i);
  });

  it('rejects QR for wrong event', async () => {
    const host = await createHost();
    const event1 = await createEvent(host._id.toString());
    const event2 = await createEvent(host._id.toString());
    const user = await createUser();
    const { qrToken } = await createBookingAndPass(user._id.toString(), event1._id.toString(), host._id.toString());
    const token = makeToken(host._id.toString(), 'host');

    const res = await request(app)
      .post('/api/v1/passes/scan')
      .set('Authorization', `Bearer ${token}`)
      .send({ qrToken, eventId: event2._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/different event/i);
  });

  it('rejects invalid QR token', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString());
    const token = makeToken(host._id.toString(), 'host');

    const res = await request(app)
      .post('/api/v1/passes/scan')
      .set('Authorization', `Bearer ${token}`)
      .send({ qrToken: 'invalid.token.here', eventId: event._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid qr/i);
  });

  it('rejects scan for cancelled pass', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString());
    const user = await createUser();
    const { pass, qrToken } = await createBookingAndPass(user._id.toString(), event._id.toString(), host._id.toString());
    const token = makeToken(host._id.toString(), 'host');

    const { Pass } = await import('../models/Pass');
    await Pass.findByIdAndUpdate(pass._id, { status: 'cancelled' });

    const res = await request(app)
      .post('/api/v1/passes/scan')
      .set('Authorization', `Bearer ${token}`)
      .send({ qrToken, eventId: event._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cancelled/i);
  });

  it('non-host cannot scan QR', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString());
    const user = await createUser();
    const { qrToken } = await createBookingAndPass(user._id.toString(), event._id.toString(), host._id.toString());
    const attendeeToken = makeToken(user._id.toString());

    const res = await request(app)
      .post('/api/v1/passes/scan')
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({ qrToken, eventId: event._id.toString() });

    expect(res.status).toBe(403);
  });
});
