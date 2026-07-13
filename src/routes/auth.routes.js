import { Router } from 'express';
import { registerValidator, loginValidator, refreshValidator, forgotPasswordValidator, verifyOtpValidator, resetPasswordValidator, profileUpdateValidator } from '../validators/auth.validator.js';
import * as authController from '../controllers/auth.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { uploadUserProfile } from '../middlewares/upload.middleware.js';
import rateLimit from 'express-rate-limit';

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many requests. Try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post('/register', registerValidator, authController.register);
router.post('/login', loginValidator, authController.login);
router.post('/refresh', refreshValidator, authController.refresh);
router.get('/me', authMiddleware, authController.me);
router.post('/logout', authMiddleware, authController.logout);
router.put('/profile', authMiddleware, uploadUserProfile.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'watermark', maxCount: 1 },
]), profileUpdateValidator, authController.updateProfile);
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidator, authController.forgotPassword);
router.post('/verify-otp', verifyOtpValidator, authController.verifyOtp);
router.post('/reset-password', resetPasswordValidator, authController.resetPassword);

export default router;
