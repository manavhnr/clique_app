import request from 'supertest';
import app from '../app';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/setup';
import { createUser, makeToken } from './helpers/factory';

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(clearTestDB);

describe('User Profile', () => {
  it('GET /users/profile — returns own profile', async () => {
    const user = await createUser();
    const token = makeToken(user._id.toString());
    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user._id).toBe(user._id.toString());
  });

  it('PUT /users/profile — updates name and bio', async () => {
    const user = await createUser();
    const token = makeToken(user._id.toString());
    const res = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', bio: 'Updated bio' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('New Name');
  });

  it('PUT /users/profile — rejects duplicate username', async () => {
    const user1 = await createUser({ username: 'taken_name' });
    const user2 = await createUser();
    const token = makeToken(user2._id.toString());
    const res = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'taken_name' });
    expect(res.status).toBe(409);
  });

  it('GET /users/:userId — returns public profile', async () => {
    const user1 = await createUser();
    const user2 = await createUser();
    const token = makeToken(user1._id.toString());
    const res = await request(app)
      .get(`/api/v1/users/${user2._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(user2.username);
  });
});
