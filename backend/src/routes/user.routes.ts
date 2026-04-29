import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadImage } from '../middleware/upload.middleware';
import { updateProfileSchema } from '../validators/user.validator';
import {
  getMyProfile,
  getPublicProfile,
  updateMyProfile,
  uploadMyProfileImage,
  deleteMyAccount,
} from '../controllers/user.controller';

const router = Router();

router.use(authenticate);

router.get('/profile', getMyProfile);
router.put('/profile', validate(updateProfileSchema), updateMyProfile);
router.post('/profile-image', uploadImage.single('image'), uploadMyProfileImage);
router.delete('/account', deleteMyAccount);
router.get('/:userId', getPublicProfile);

export default router;
