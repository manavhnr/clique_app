import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_TEST_URI = mongod.getUri();
  // Store instance reference for teardown
  (global as Record<string, unknown>).__MONGOD__ = mongod;
}
