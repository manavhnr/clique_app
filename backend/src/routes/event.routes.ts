import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireVerifiedHost } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadMedia } from '../middleware/upload.middleware';
import { createEventSchema, updateEventSchema, cancelEventSchema, addTierSchema } from '../validators/event.validator';
import {
  create,
  getEvent,
  update,
  publish,
  cancel,
  remove,
  save,
  unsave,
  myEvents,
  feed,
  publicEvents,
  addCoHostHandler,
  removeCoHostHandler,
  addScannerHandler,
  removeScannerHandler,
  addTierHandler,
  openTierHandler,
  closeTierHandler,
  recalculateCountHandler,
} from '../controllers/event.controller';
import { nearMe, eventSearch } from './search.routes';

const router = Router();

// No auth required — landing page uses this
router.get('/public', publicEvents);

router.use(authenticate);

// Public reads
router.get('/feed', feed);
router.get('/near-me', nearMe);
router.get('/search', eventSearch);
router.get('/mine', myEvents);
router.get('/:eventId', getEvent);

// Host-only writes
router.post('/', requireVerifiedHost,
  uploadMedia.fields([{ name: 'images', maxCount: 10 }, { name: 'videos', maxCount: 3 }]),
  validate(createEventSchema), create);
router.put('/:eventId', requireVerifiedHost,
  uploadMedia.fields([{ name: 'images', maxCount: 10 }, { name: 'videos', maxCount: 3 }]),
  validate(updateEventSchema), update);
router.patch('/:eventId/publish', requireVerifiedHost, publish);
router.patch('/:eventId/cancel', cancel);   // host or admin — enforced in service
router.delete('/:eventId', requireVerifiedHost, remove);

// Co-host management (host only)
router.post('/:eventId/co-hosts', requireVerifiedHost, addCoHostHandler);
router.delete('/:eventId/co-hosts/:userId', requireVerifiedHost, removeCoHostHandler);

// Scanner permission management (host only)
router.post('/:eventId/scanners', requireVerifiedHost, addScannerHandler);
router.delete('/:eventId/scanners/:userId', requireVerifiedHost, removeScannerHandler);

// Ticket phase management (host only)
router.patch('/:eventId/recalculate-count', requireVerifiedHost, recalculateCountHandler);
router.post('/:eventId/tiers', requireVerifiedHost, validate(addTierSchema), addTierHandler);
router.patch('/:eventId/tiers/:tierId/open', requireVerifiedHost, openTierHandler);
router.patch('/:eventId/tiers/:tierId/close', requireVerifiedHost, closeTierHandler);

// Any authenticated user
router.post('/:eventId/save', save);
router.delete('/:eventId/save', unsave);

export default router;
