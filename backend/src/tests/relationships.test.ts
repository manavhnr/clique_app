import request from 'supertest';
import app from '../app';
import { setupTestDB, teardownTestDB, clearTestDB } from './helpers/setup';
import { createUser, makeToken } from './helpers/factory';

beforeAll(setupTestDB);
afterAll(teardownTestDB);
afterEach(clearTestDB);

describe('Relationships', () => {
  it('follow and unfollow a user', async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    const token = makeToken(u1._id.toString());

    const follow = await request(app)
      .post(`/api/v1/relationships/follow/${u2._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(follow.status).toBe(200);

    const status = await request(app)
      .get(`/api/v1/relationships/status/${u2._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(status.body.data.isFollowing).toBe(true);

    const unfollow = await request(app)
      .delete(`/api/v1/relationships/follow/${u2._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(unfollow.status).toBe(200);
  });

  it('cannot follow yourself', async () => {
    const u = await createUser();
    const token = makeToken(u._id.toString());
    const res = await request(app)
      .post(`/api/v1/relationships/follow/${u._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('cannot follow twice', async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    const token = makeToken(u1._id.toString());
    await request(app).post(`/api/v1/relationships/follow/${u2._id}`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).post(`/api/v1/relationships/follow/${u2._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  it('block removes follow relationship', async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    const token = makeToken(u1._id.toString());
    await request(app).post(`/api/v1/relationships/follow/${u2._id}`).set('Authorization', `Bearer ${token}`);
    const block = await request(app).post(`/api/v1/relationships/block/${u2._id}`).set('Authorization', `Bearer ${token}`);
    expect(block.status).toBe(200);

    const status = await request(app).get(`/api/v1/relationships/status/${u2._id}`).set('Authorization', `Bearer ${token}`);
    expect(status.body.data.isFollowing).toBe(false);
    expect(status.body.data.isBlocked).toBe(true);
  });

  it('get followers and following lists', async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    const token1 = makeToken(u1._id.toString());
    await request(app).post(`/api/v1/relationships/follow/${u2._id}`).set('Authorization', `Bearer ${token1}`);

    const followers = await request(app).get(`/api/v1/relationships/followers/${u2._id}`).set('Authorization', `Bearer ${token1}`);
    expect(followers.body.data.users).toHaveLength(1);

    const following = await request(app).get(`/api/v1/relationships/following/${u1._id}`).set('Authorization', `Bearer ${token1}`);
    expect(following.body.data.users).toHaveLength(1);
  });
});
