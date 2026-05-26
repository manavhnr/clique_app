import { connectDB } from './config/db';
import app from './app';

const PORT = process.env.PORT ?? 5001;

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB().catch((err) => console.error('MongoDB initial connection failed:', err.message));
});
