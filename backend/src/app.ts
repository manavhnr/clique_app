import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/error.middleware';
import { sanitizeInput, securityHeaders } from './middleware/sanitize.middleware';

import paymentRouter from './routes/payment.routes';
import payuRouter from './routes/payu.routes';
import authRouter from './routes/auth.routes';
import userRouter from './routes/user.routes';
import relationshipRouter from './routes/relationship.routes';
import postRouter from './routes/post.routes';
import feedRouter from './routes/feed.routes';
import hostRouter from './routes/host.routes';
import eventRouter from './routes/event.routes';
import searchRouter from './routes/search.routes';
import requestRouter from './routes/request.routes';
import bookingRouter from './routes/booking.routes';
import passRouter from './routes/pass.routes';
import notificationRouter from './routes/notification.routes';
import adminRouter from './routes/admin.routes';
import reportRouter from './routes/report.routes';
import eventRatingRouter from './routes/eventRating.routes';
import messageRouter from './routes/message.routes';
import squadRouter from './routes/squad.routes';

const app = express();

// Behind Render/other proxies — required for correct client IPs in rate limiting
app.set('trust proxy', 1);

app.use(securityHeaders);

// CORS allowlist — comma-separated origins in CORS_ORIGINS, falls back to localhost in dev
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / server-to-server (no Origin header) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Rate limiter applied first so payment/webhook routes are also covered
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

// Raw body for payment/PayU webhooks — must be before express.json()
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/payu', payuRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);

app.get('/health', (_req, res) => res.json({ success: true, message: 'Clique backend running' }));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/relationships', relationshipRouter);
app.use('/api/v1/posts', postRouter);
app.use('/api/v1/feed', feedRouter);
app.use('/api/v1/hosts', hostRouter);
app.use('/api/v1/events', eventRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/requests', requestRouter);
app.use('/api/v1/bookings', bookingRouter);
app.use('/api/v1/passes', passRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/ratings', eventRatingRouter);
app.use('/api/v1/messages', messageRouter);
app.use('/api/v1/squads', squadRouter);

app.use(errorHandler);

export default app;
