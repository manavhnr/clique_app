import request from 'supertest';
import app from '../app';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/setup';
import { createUser, createHost, createEvent, makeToken } from './helpers/factory';

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(clearTestDB);

describe('Event System', () => {
  it('verified host can create event', async () => {
    const host = await createHost();
    const token = makeToken(host._id.toString(), 'host');
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Night Out')
      .field('description', 'A great night out event for everyone')
      .field('category', 'club')
      .field('date', new Date(Date.now() + 86400000).toISOString())
      .field('startTime', '21:00')
      .field('endTime', '23:00')
      .field('locationName', 'Club XYZ')
      .field('address', '123 Main Street, Chennai')
      .field('latitude', '13.0827')
      .field('longitude', '80.2707')
      .field('price', '0')
      .field('capacity', '50')
      .field('status', 'published');
    expect(res.status).toBe(201);
    expect(res.body.data.event.title).toBe('Night Out');
  });

  it('unverified user cannot create event', async () => {
    const user = await createUser();
    const token = makeToken(user._id.toString());
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test' });
    expect(res.status).toBe(403);
  });

  it('get event detail', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString());
    const user = await createUser();
    const token = makeToken(user._id.toString());
    const res = await request(app)
      .get(`/api/v1/events/${event._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.event.title).toBe('Test Event');
  });

  it('cancel event invalidates passes', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString());
    const user = await createUser();
    const { pass } = await (await import('./helpers/factory')).createBookingAndPass(
      user._id.toString(), event._id.toString(), host._id.toString()
    );
    const token = makeToken(host._id.toString(), 'host');
    const res = await request(app)
      .patch(`/api/v1/events/${event._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const { Pass } = await import('../models/Pass');
    const updatedPass = await Pass.findById(pass._id);
    expect(updatedPass?.status).toBe('cancelled');
  });

  it('only draft events can be deleted', async () => {
    const host = await createHost();
    const event = await createEvent(host._id.toString(), { status: 'published' });
    const token = makeToken(host._id.toString(), 'host');
    const res = await request(app)
      .delete(`/api/v1/events/${event._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
