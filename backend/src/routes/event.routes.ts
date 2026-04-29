import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireVerifiedHost } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadMedia } from '../middleware/upload.middleware';
import { createEventSchema, updateEventSchema, cancelEventSchema } from '../validators/event.validator';
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
} from '../controllers/event.controller';
import { nearMe, eventSearch } from './search.routes';

const router = Router();

router.use(authenticate);

// Public reads
router.get('/feed', feed);
router.get('/near-me', nearMe);
router.get('/search', eventSearch);
router.get('/mine', myEvents);
router.get('/:eventId', getEvent);

// Host-only writes
router.post('/', requireVerifiedHost, uploadMedia.array('images', 10), validate(createEventSchema), create);
router.put('/:eventId', requireVerifiedHost, validate(updateEventSchema), update);
router.patch('/:eventId/publish', requireVerifiedHost, publish);
router.patch('/:eventId/cancel', cancel);   // host or admin — enforced in service
router.delete('/:eventId', requireVerifiedHost, remove);

// Any authenticated user
router.post('/:eventId/save', save);
router.delete('/:eventId/save', unsave);

export default router;
