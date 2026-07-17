import { Resend } from 'resend';
import config from '../config/index.js';
import logger from './logger.js';

const resend = new Resend(config.resend.apiKey);

const formatDate = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildOtpHtml = (user, otpCode) => `
<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>${config.companyName}</h2>
  <p>Hi ${user.name},</p>
  <p>Your OTP code is:</p>
  <h1 style="letter-spacing: 5px; background: #f4f4f4; padding: 10px; text-align: center;">${otpCode}</h1>
  <p>This code expires in 10 minutes.</p>
  <p>If you didn't request this, please ignore this email.</p>
</body></html>`;

const buildAdminAlertHtml = (user) => `
<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>New User Registration</h2>
  <p><strong>Name:</strong> ${user.name}</p>
  <p><strong>Email:</strong> ${user.email}</p>
  <p><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
  <p><strong>Registered:</strong> ${formatDate(user.createdAt)}</p>
  <p><a href="${config.adminPanelUrl}">Go to Admin Panel</a></p>
</body></html>`;

const buildApprovalHtml = (user) => `
<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Welcome to ${config.companyName}</h2>
  <p>Hi ${user.name},</p>
  <p>Your account has been approved. You can now log in and start using the platform.</p>
  <p><a href="${config.frontendLoginUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Dashboard</a></p>
  <p>If you have any questions, contact us at ${config.companySupportEmail}.</p>
</body></html>`;

export const sendOtpEmail = async (user, otpCode) => {
  try {
    logger.debug(`sendOtpEmail user keys=[${Object.keys(user)}] email=${!!user.email} name=${!!user.name}`);
    const { data, error } = await resend.emails.send({
      from: config.resend.fromEmail,
      to: user.email,
      subject: `Your OTP Code - ${config.companyName}`,
      html: buildOtpHtml(user, otpCode),
    });
    if (error) {
      logger.error(`sendOtpEmail failed: ${JSON.stringify(error)}`);
      return;
    }
    logger.debug(`sendOtpEmail OK id=${data?.id}`);
  } catch (err) {
    logger.error(`sendOtpEmail failed. to="${user?.email}": ${err.message}`);
  }
};

export const sendAdminNotificationEmail = async (adminEmail, user) => {
  try {
    const { data, error } = await resend.emails.send({
      from: config.resend.fromEmail,
      to: adminEmail,
      subject: `New User Registration - ${config.companyName}`,
      html: buildAdminAlertHtml(user),
    });
    if (error) {
      logger.error(`sendAdminNotificationEmail failed: ${JSON.stringify(error)}`);
      return;
    }
    logger.debug(`sendAdminNotificationEmail OK id=${data?.id}`);
  } catch (err) {
    logger.error(`sendAdminNotificationEmail failed. to="${adminEmail}": ${err.message}`);
  }
};

export const sendApprovalEmail = async (user) => {
  try {
    const { data, error } = await resend.emails.send({
      from: config.resend.fromEmail,
      to: user.email,
      subject: `Account Approved - ${config.companyName}`,
      html: buildApprovalHtml(user),
    });
    if (error) {
      logger.error(`sendApprovalEmail failed: ${JSON.stringify(error)}`);
      return;
    }
    logger.debug(`sendApprovalEmail OK id=${data?.id}`);
  } catch (err) {
    logger.error(`sendApprovalEmail failed. to="${user?.email}": ${err.message}`);
  }
};
