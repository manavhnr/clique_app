import mongoose from 'mongoose';

async function tryConnect(uri: string): Promise<void> {
  await mongoose.connect(uri, {
    family: 4,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
}

const MAX_ATTEMPTS = 10;

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not defined in environment');

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await tryConnect(uri);
      console.log('MongoDB connected');
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`MongoDB attempt ${attempt}/${MAX_ATTEMPTS} failed: ${msg}`);
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(`MongoDB connection failed after ${MAX_ATTEMPTS} attempts: ${msg}`);
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
