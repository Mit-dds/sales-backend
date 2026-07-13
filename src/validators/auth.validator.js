import { body } from 'express-validator';

const sanitizePhone = (value) => {
  if (!value) return value;
  return value.replace(/\D/g, '');
};

export const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .customSanitizer(sanitizePhone)
    .isLength({ min: 7, max: 15 }).withMessage('Phone must be 7-15 digits'),

  body('profileEmail')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail().withMessage('Invalid profile email format')
    .normalizeEmail(),
];

export const loginValidator = [
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .customSanitizer(sanitizePhone)
    .isLength({ min: 7, max: 15 }).withMessage('Invalid phone number'),

  body('password')
    .notEmpty().withMessage('Password is required'),

  body().custom((value) => {
    if (!value.email && !value.phone) {
      throw new Error('Email or phone is required');
    }
    return true;
  }),
];

export const refreshValidator = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required')
    .isString().withMessage('Refresh token must be a string'),
];

export const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
];

export const verifyOtpValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),
];

export const resetPasswordValidator = [
  body('resetToken')
    .notEmpty().withMessage('Reset token is required')
    .isString().withMessage('Reset token must be a string'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export const profileUpdateValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
];
