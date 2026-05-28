import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import {
  stats, users, ban, unban,
  events, blockEv, unblockEv,
  reports, resolveRep,
  pendingHosts, allHosts, approveHost, rejectHost,
} from '../controllers/admin.controller';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/stats', stats);
router.get('/users', users);
router.patch('/users/:userId/ban', ban);
router.patch('/users/:userId/unban', unban);
router.get('/events', events);
router.patch('/events/:eventId/block', blockEv);
router.patch('/events/:eventId/unblock', unblockEv);
router.get('/reports', reports);
router.patch('/reports/:reportId/resolve', resolveRep);
router.get('/hosts/pending', pendingHosts);
router.get('/hosts', allHosts);
router.patch('/hosts/:userId/approve', approveHost);
router.patch('/hosts/:userId/reject', rejectHost);

export default router;
