import 'dotenv/config'; // load .env before any config validation runs
import { connectDB } from './config/db';
import { validateEnv } from './config/env';
import { startSchedulers } from './jobs/scheduler';
import app from './app';

const PORT = process.env.PORT ?? 5001;

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

async function start(): Promise<void> {
  validateEnv();
  await connectDB();
  startSchedulers();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch((err) => {
  console.error('Fatal startup error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
