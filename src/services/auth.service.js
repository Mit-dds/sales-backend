import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import config from '../config/index.js';
import ApiError from '../utils/apiError.js';
import { sendOtpEmail, sendAdminNotificationEmail, sendApprovalEmail } from '../utils/emailjs.service.js';
import generateOtp from '../utils/otpGenerator.js';
import logger from '../utils/logger.js';

const SALT_ROUNDS = 12;

const OTP_EXPIRY_MINUTES = 10;

const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, type: 'access' },
    config.accessToken.secret,
    { expiresIn: config.accessToken.expiresIn }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id, type: 'refresh' },
    config.refreshToken.secret,
    { expiresIn: config.refreshToken.expiresIn }
  );
};

const generateResetToken = (userId) => {
  return jwt.sign(
    { userId, type: 'password_reset' },
    config.resetToken.secret,
    { expiresIn: config.resetToken.expiresIn }
  );
};

const sanitizePhone = (value) => {
  if (!value) return value;
  return value.replace(/\D/g, '');
};

const excludePassword = (user) => {
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

const getLoginErrorMessage = (status) => {
  switch (status) {
    case 'PENDING':
      return 'Account pending admin approval';
    case 'INACTIVE':
    case 'REMOVED':
    default:
      return 'Account is not active. Contact admin';
  }
};

const notifyAdminsOfRegistration = async (user) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true },
    });

    if (admins.length === 0) {
      logger.warn('No admin users found to notify about new registration');
      return;
    }

    for (const admin of admins) {
      await sendAdminNotificationEmail(admin.email, user);
    }
  } catch (err) {
    logger.error('Failed to send admin notification email: ' + err.message);
  }
};

export const registerUser = async ({ name, email, password, phone, profileEmail }) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        ...(phone ? [{ phone: sanitizePhone(phone) }] : []),
      ],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(409, 'Email already registered');
    }
    if (phone && existingUser.phone === sanitizePhone(phone)) {
      throw new ApiError(409, 'Phone number already registered');
    }
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      phone: phone ? sanitizePhone(phone) : null,
      profileEmail: profileEmail || null,
      role: 'agent',
      status: 'PENDING',
    },
  });

  const userData = excludePassword(user);
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  notifyAdminsOfRegistration(user);

  return { user: userData, accessToken, refreshToken };
};

export const loginUser = async ({ email, phone, password }) => {
  if (!email && !phone) {
    throw new ApiError(400, 'Email or phone is required');
  }

  const where = email
    ? { email }
    : { phone: sanitizePhone(phone) };

  const user = await prisma.user.findUnique({ where });

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (user.status !== 'ACTIVE') {
    throw new ApiError(403, getLoginErrorMessage(user.status));
  }

  const userData = excludePassword(user);
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return { user: userData, accessToken, refreshToken };
};

export const refreshTokens = async (refreshToken) => {
  let payload;
  try {
    payload = jwt.verify(refreshToken, config.refreshToken.secret);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  if (payload.type !== 'refresh') {
    throw new ApiError(401, 'Invalid token type');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw new ApiError(401, 'User not found');
  }
  if (user.status !== 'ACTIVE') {
    throw new ApiError(403, getLoginErrorMessage(user.status));
  }

  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  return { accessToken, refreshToken: newRefreshToken };
};

export const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return;
  }

  await prisma.passwordResetOtp.deleteMany({
    where: { userId: user.id, used: false },
  });

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.passwordResetOtp.create({
    data: {
      userId: user.id,
      otp,
      expiresAt,
    },
  });

  await sendOtpEmail(user, otp);
};

export const verifyOtp = async (email, otp) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(400, 'Invalid OTP');
  }

  const otpRecord = await prisma.passwordResetOtp.findFirst({
    where: {
      userId: user.id,
      otp,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!otpRecord) {
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  await prisma.passwordResetOtp.update({
    where: { id: otpRecord.id },
    data: { used: true },
  });

  const resetToken = generateResetToken(user.id);

  return { resetToken };
};

export const resetPassword = async (resetToken, newPassword) => {
  let payload;
  try {
    payload = jwt.verify(resetToken, config.resetToken.secret);
  } catch (err) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  if (payload.type !== 'password_reset') {
    throw new ApiError(400, 'Invalid token type');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: payload.userId },
    data: { passwordHash },
  });
};

export const updateUserStatus = async (userId, newStatus) => {
  const validStatuses = ['PENDING', 'ACTIVE', 'INACTIVE', 'REMOVED'];
  if (!validStatuses.includes(newStatus)) {
    throw new ApiError(400, 'Invalid status value');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { status: newStatus },
  });

  if (user.status === 'PENDING' && newStatus === 'ACTIVE') {
    sendApprovalEmail(updatedUser).catch((err) => {
      logger.error('Failed to send approval email via EmailJS: ' + err.message);
    });
  }

  return excludePassword(updatedUser);
};

export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return excludePassword(user);
};

export const updateProfile = async (userId, { name, photoUrl, watermarkUrl }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (photoUrl !== undefined) updateData.photo = photoUrl;
  if (watermarkUrl !== undefined) updateData.watermark = watermarkUrl;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return excludePassword(updatedUser);
};
