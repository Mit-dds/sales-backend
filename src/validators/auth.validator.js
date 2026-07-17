import { body } from 'express-validator';

const sanitizePhone = (value) => {
  if (!value) return value;
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('971') && digits.length > 9) return '+' + digits;
  if (digits.startsWith('0') && digits.length > 8) return '+971' + digits.slice(1);
  if (digits.length > 5) return '+971' + digits;
  return digits;
};

const isUaePhone = (value) => {
  if (!value) return true;
  if (!/^\+971\d{7,12}$/.test(value)) {
    throw new Error('Enter a valid UAE number (e.g., +971 50 123 4567)');
  }
  return true;
};

export const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name cannot contain numbers'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .customSanitizer(sanitizePhone)
    .custom(isUaePhone),

  body('profileEmail')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail().withMessage('Invalid profile email format')
    .normalizeEmail({ gmail_remove_dots: false }),
];

export const loginValidator = [
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .customSanitizer(sanitizePhone)
    .custom(isUaePhone),

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
    .normalizeEmail({ gmail_remove_dots: false }),
];

export const verifyOtpValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail({ gmail_remove_dots: false }),

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
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name cannot contain numbers'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .customSanitizer(sanitizePhone)
    .custom(isUaePhone),

  body('profileEmail')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail().withMessage('Invalid profile email format')
    .normalizeEmail({ gmail_remove_dots: false }),
];
