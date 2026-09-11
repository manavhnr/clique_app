import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sendOTP, verifyOTP, register, login, getMe, refresh, logout, forgotPasswordHandler, resetPasswordHandler } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sendOTPSchema, verifyOTPSchema, loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validator';

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Try again in 10 minutes.' },
});

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/send-otp', otpLimiter, validate(sendOTPSchema), sendOTP);
router.post('/verify-otp', otpLimiter, validate(verifyOTPSchema), verifyOTP);
router.post('/forgot-password', otpLimiter, validate(forgotPasswordSchema), forgotPasswordHandler);
router.post('/reset-password', otpLimiter, validate(resetPasswordSchema), resetPasswordHandler);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;
