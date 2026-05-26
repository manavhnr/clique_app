import mongoose from 'mongoose';

async function tryConnect(uri: string): Promise<void> {
  await mongoose.connect(uri, {
    family: 4,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
}

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not defined in environment');

  let attempt = 0;
  while (true) {
    try {
      await tryConnect(uri);
      console.log('MongoDB connected');
      return;
    } catch (err: unknown) {
      attempt++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`MongoDB attempt ${attempt} failed: ${msg}`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
