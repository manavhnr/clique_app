import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/error.middleware';

import paymentRouter from './routes/payment.routes';
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

app.use(cors());

// Raw body for Razorpay webhook — must be before express.json()
app.use('/api/v1/payments', paymentRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

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
