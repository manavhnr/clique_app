import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadImage } from '../middleware/upload.middleware';
import { updateProfileSchema, updateSettingsSchema, saveUpiIdSchema, requestPhoneChangeSchema, verifyPhoneChangeSchema } from '../validators/user.validator';
import {
  checkUsername,
  getMyProfile,
  getPublicProfile,
  updateMyProfile,
  uploadMyProfileImage,
  deleteMyAccount,
  updateSettings,
  saveUpiId,
  requestPhoneChange,
  verifyPhoneChange,
} from '../controllers/user.controller';

const router = Router();

router.use(authenticate);

router.get('/check-username', checkUsername);
router.get('/profile', getMyProfile);
router.put('/profile', validate(updateProfileSchema), updateMyProfile);
router.post('/profile-image', uploadImage.single('image'), uploadMyProfileImage);
router.delete('/account', deleteMyAccount);
router.patch('/settings', validate(updateSettingsSchema), updateSettings);
router.patch('/upi', validate(saveUpiIdSchema), saveUpiId);
router.post('/change-phone/request', validate(requestPhoneChangeSchema), requestPhoneChange);
router.post('/change-phone/verify', validate(verifyPhoneChangeSchema), verifyPhoneChange);
router.get('/:userId', getPublicProfile);

export default router;
