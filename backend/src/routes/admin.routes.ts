import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import {
  stats, users, ban, unban, userDetail,
  events, eventDetail, blockEv, unblockEv, removeGuest, recalculateCount, generatePassForBooking,
  adminCreateEvent,
  reports, resolveRep,
  pendingHosts, allHosts, verifiedHosts, approveHost, rejectHost, hostDashboard,
  getConfig, setConfig,
} from '../controllers/admin.controller';
import { uploadMedia } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import { createEventSchema } from '../validators/event.validator';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/stats', stats);
router.get('/users', users);
router.get('/users/:userId', userDetail);
router.patch('/users/:userId/ban', ban);
router.patch('/users/:userId/unban', unban);
router.get('/events', events);
router.post('/events',
  uploadMedia.fields([{ name: 'images', maxCount: 10 }, { name: 'videos', maxCount: 3 }]),
  validate(createEventSchema),
  adminCreateEvent
);
router.get('/events/:eventId', eventDetail);
router.patch('/events/:eventId/block', blockEv);
router.patch('/events/:eventId/unblock', unblockEv);
router.delete('/events/:eventId/bookings/:bookingId', removeGuest);
router.post('/bookings/:bookingId/generate-pass', generatePassForBooking);
router.patch('/events/:eventId/recalculate-count', recalculateCount);
router.get('/reports', reports);
router.patch('/reports/:reportId/resolve', resolveRep);
router.get('/hosts/pending', pendingHosts);
router.get('/hosts/verified', verifiedHosts);
router.get('/hosts', allHosts);
router.patch('/hosts/:userId/approve', approveHost);
router.patch('/hosts/:userId/reject', rejectHost);
router.get('/hosts/:userId/dashboard', hostDashboard);

router.get('/config', getConfig);
router.put('/config', setConfig);

export default router;
