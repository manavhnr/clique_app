import request from 'supertest';
import app from '../app';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/setup';
import { createUser, createHost, createEvent, makeToken } from './helpers/factory';
import { Event } from '../models/Event';

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(clearTestDB);

describe('Booking Engine', () => {
  it('books a free event and generates pass immediately', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString(), { price: 0 });
    const user = await createUser();
    const token = makeToken(user._id.toString());

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId: event._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.data.booking.status).toBe('confirmed');
    expect(res.body.data.pass).toBeTruthy();
  });

  it('paid event booking goes to payment_pending', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString(), { price: 500 });
    const user = await createUser();
    const token = makeToken(user._id.toString());

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId: event._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.data.booking.status).toBe('payment_pending');
    expect(res.body.data.pass).toBeNull();
  });

  it('prevents duplicate booking', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString());
    const user = await createUser();
    const token = makeToken(user._id.toString());

    await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send({ eventId: event._id.toString() });
    const res = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send({ eventId: event._id.toString() });
    expect(res.status).toBe(409);
  });

  it('host cannot book own event', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString());
    const token = makeToken(host._id.toString(), 'host');

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId: event._id.toString() });
    expect(res.status).toBe(400);
  });

  it('prevents overbooking — capacity enforcement', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString(), { capacity: 1 });
    const user1 = await createUser();
    const user2 = await createUser();

    await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${makeToken(user1._id.toString())}`)
      .send({ eventId: event._id.toString() });

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${makeToken(user2._id.toString())}`)
      .send({ eventId: event._id.toString() });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/fully booked/i);
  });

  it('private event requires approved join request', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString(), { privacy: 'private', approvalRequired: true });
    const user = await createUser();
    const token = makeToken(user._id.toString());

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId: event._id.toString() });
    expect(res.status).toBe(403);
  });

  it('cancel booking releases capacity slot', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString(), { capacity: 1 });
    const user = await createUser();
    const token = makeToken(user._id.toString());

    const bookRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId: event._id.toString() });

    const bookingId = bookRes.body.data.booking._id;
    await request(app)
      .patch(`/api/v1/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    const updated = await Event.findById(event._id);
    expect(updated?.bookedCount).toBe(0);
  });
});
