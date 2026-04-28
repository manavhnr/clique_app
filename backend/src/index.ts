import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Clique backend running' });
});

// Routes will be mounted here from Phase 4 onward
// app.use('/api/v1/auth', authRouter);

app.use(errorHandler);

const PORT = process.env.PORT ?? 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

export default app;
