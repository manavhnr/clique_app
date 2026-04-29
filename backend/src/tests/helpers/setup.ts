import mongoose from 'mongoose';

export async function setupTestDB(): Promise<void> {
  const uri = process.env.MONGO_TEST_URI;
  if (!uri) throw new Error('MONGO_TEST_URI not set — globalSetup may have failed');
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
}

export async function teardownTestDB(): Promise<void> {
  await mongoose.disconnect();
}

export async function clearTestDB(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
