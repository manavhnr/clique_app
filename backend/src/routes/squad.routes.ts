import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createSquadSchema, inviteToSquadSchema, respondInviteSchema } from '../validators/squad.validator';
import { create, mySquad, allSquads, invite, respond, leave, approveGroupHandler } from '../controllers/squad.controller';

const router = Router();

router.use(authenticate);

router.post('/',                             validate(createSquadSchema),  create);
router.get('/event/:eventId',                                              mySquad);
router.get('/event/:eventId/all',                                          allSquads);   // host only
router.post('/:squadId/invite',              validate(inviteToSquadSchema), invite);
router.patch('/:squadId/respond',            validate(respondInviteSchema), respond);
router.delete('/:squadId/leave',                                            leave);
router.patch('/:squadId/approve',                                           approveGroupHandler);

export default router;
