import { validationResult } from 'express-validator';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import * as authService from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw new ApiError(400, messages.join('; '));
  }

  const { name, email, password, phone, profileEmail } = req.body;
  const result = await authService.registerUser({ name, email, password, phone, profileEmail });

  res.status(201).json({
    success: true,
    message: 'Registration successful. Await admin approval',
    data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken },
  });
});

export const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw new ApiError(400, messages.join('; '));
  }

  const { email, phone, password } = req.body;
  const result = await authService.loginUser({ email, phone, password });

  res.json({
    success: true,
    message: 'Login successful',
    data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw new ApiError(400, messages.join('; '));
  }

  const { refreshToken } = req.body;
  const result = await authService.refreshTokens(refreshToken);

  res.json({
    success: true,
    message: 'Token refreshed',
    data: { accessToken: result.accessToken, refreshToken: result.refreshToken },
  });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);

  res.json({
    success: true,
    data: user,
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw new ApiError(400, messages.join('; '));
  }

  const { email } = req.body;
  await authService.forgotPassword(email);

  res.json({
    success: true,
    message: 'If an account exists with this email, an OTP has been sent',
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw new ApiError(400, messages.join('; '));
  }

  const { email, otp } = req.body;
  const result = await authService.verifyOtp(email, otp);

  res.json({
    success: true,
    message: 'OTP verified',
    data: { resetToken: result.resetToken },
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw new ApiError(400, messages.join('; '));
  }

  const { resetToken, newPassword } = req.body;
  await authService.resetPassword(resetToken, newPassword);

  res.json({
    success: true,
    message: 'Password reset successful',
  });
});

export const logout = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw new ApiError(400, messages.join('; '));
  }

  const name = req.body.name;
  const photoFile = req.files?.photo?.[0];
  const watermarkFile = req.files?.watermark?.[0];

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  
  if (photoFile) {
    updateData.photoUrl = `/uploads/users/${photoFile.filename}`;
  } else if (req.body.photo === "" || req.body.photo === "null") {
    updateData.photoUrl = null;
  }

  if (watermarkFile) {
    updateData.watermarkUrl = `/uploads/users/${watermarkFile.filename}`;
  } else if (req.body.watermark === "" || req.body.watermark === "null") {
    updateData.watermarkUrl = null;
  }

  const user = await authService.updateProfile(req.user.id, updateData);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: user,
  });
});
