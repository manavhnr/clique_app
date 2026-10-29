import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
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
  addGroupDealHandler,
  removeGroupDealHandler,
  recalculateCountHandler,
  scannableEvents,
} from '../controllers/event.controller';
import { guestlistAdd, hostRemoveGuestHandler } from '../controllers/booking.controller';
import { addDiscountsHandler, getDiscountsHandler, updateDiscountHandler, revokeDiscountHandler } from '../controllers/discount.controller';
import { addDiscountsSchema, updateDiscountSchema } from '../validators/discount.validator';
import { nearMe, eventSearch } from './search.routes';

const router = Router();

// No auth required — landing page uses this
router.get('/public', publicEvents);

// Specific routes MUST come before /:eventId to avoid the wildcard swallowing them
router.get('/feed', authenticate, feed);
router.get('/near-me', authenticate, nearMe);
router.get('/search', authenticate, eventSearch);
router.get('/mine', authenticate, myEvents);
router.get('/scannable', authenticate, scannableEvents);

// Guest-accessible with optional auth (shared event links) — wildcard last
router.get('/:eventId', optionalAuthenticate, getEvent);

router.use(authenticate);

// Host-only writes
router.post('/', requireVerifiedHost,
  uploadMedia.fields([{ name: 'images', maxCount: 10 }, { name: 'videos', maxCount: 3 }, { name: 'floorPlan', maxCount: 5 }]),
  validate(createEventSchema), create);
router.put('/:eventId', requireVerifiedHost,
  uploadMedia.fields([{ name: 'images', maxCount: 10 }, { name: 'videos', maxCount: 3 }, { name: 'floorPlan', maxCount: 5 }]),
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

// Guestlist management (host only)
router.post('/:eventId/guestlist', requireVerifiedHost, guestlistAdd);
router.delete('/:eventId/bookings/:bookingId', requireVerifiedHost, hostRemoveGuestHandler);

// Discount management (host only)
router.post('/:eventId/discounts', requireVerifiedHost, validate(addDiscountsSchema), addDiscountsHandler);
router.get('/:eventId/discounts', requireVerifiedHost, getDiscountsHandler);
router.patch('/:eventId/discounts/:discountId', requireVerifiedHost, validate(updateDiscountSchema), updateDiscountHandler);
router.delete('/:eventId/discounts/:discountId', requireVerifiedHost, revokeDiscountHandler);

// Ticket phase management (host only)
router.patch('/:eventId/recalculate-count', requireVerifiedHost, recalculateCountHandler);
router.post('/:eventId/tiers', requireVerifiedHost, validate(addTierSchema), addTierHandler);
router.patch('/:eventId/tiers/:tierId/open', requireVerifiedHost, openTierHandler);
router.patch('/:eventId/tiers/:tierId/close', requireVerifiedHost, closeTierHandler);

// Group deal management (host only)
router.post('/:eventId/group-deals', requireVerifiedHost, addGroupDealHandler);
router.delete('/:eventId/group-deals/:index', requireVerifiedHost, removeGroupDealHandler);

// Any authenticated user
router.post('/:eventId/save', save);
router.delete('/:eventId/save', unsave);

export default router;
