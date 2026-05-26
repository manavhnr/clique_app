import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not defined in environment');

  const MAX_RETRIES = 5;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      await mongoose.connect(uri, {
        family: 4,                      // force IPv4 — prevents IPv6 routing issues on some hosts
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      console.log('MongoDB connected');
      return;
    } catch (err) {
      attempt++;
      if (attempt >= MAX_RETRIES) throw err;
      console.log(`MongoDB connection attempt ${attempt} failed, retrying in 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}
