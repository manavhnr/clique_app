import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalTeardown() {
  const mongod = (global as Record<string, unknown>).__MONGOD__ as MongoMemoryServer;
  if (mongod) await mongod.stop();
}
