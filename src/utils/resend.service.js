import { Resend } from 'resend';
import config from '../config/index.js';
import logger from './logger.js';

let _resend = null;

const getResendClient = () => {
  if (!_resend) {
    if (!config.resend.apiKey) {
      logger.warn('RESEND_API_KEY is not configured — emails will not be sent');
    }
    _resend = new Resend(config.resend.apiKey || 're_placeholder');
  }
  return _resend;
};

const formatDate = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const sendEmail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await getResendClient().emails.send({
      from: config.resend.fromEmail,
      to,
      subject,
      html,
    });

    if (error) {
      logger.error(`Resend sendEmail failed: ${error.message}`);
      return;
    }

    logger.debug(`Email sent to ${to}: subject="${subject}" id=${data?.id}`);
  } catch (err) {
    logger.error(`Resend sendEmail error: ${err.message}`);
  }
};

export const sendOtpEmail = async (user, otpCode) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #333;">Hello ${user.name},</h1>
      <p>Your verification code is:</p>
      <div style="background: #f5f5f5; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; color: #007bff;">${otpCode}</span>
      </div>
      <p style="color: #666;">This code expires in <strong>10 minutes</strong>.</p>
      <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
    </body>
    </html>
  `;

  logger.debug(`sendOtpEmail to_email="${user.email}" to_name="${user.name}"`);

  await sendEmail({
    to: user.email,
    subject: `${config.companyName} - Your Verification Code`,
    html,
  });
};

export const sendAdminNotificationEmail = async (adminEmail, user) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #333;">New User Registration</h1>
      <p>A new user has registered on ${config.companyName}:</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Name:</strong> ${user.name}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
        <p><strong>Registered:</strong> ${formatDate(user.createdAt)}</p>
      </div>
      <p>
        <a href="${config.adminPanelUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Review in Admin Panel
        </a>
      </p>
    </body>
    </html>
  `;

  logger.debug(`sendAdminNotificationEmail to="${adminEmail}"`);

  await sendEmail({
    to: adminEmail,
    subject: `${config.companyName} - New User Registration`,
    html,
  });
};

export const sendApprovalEmail = async (user) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #333;">Welcome to ${config.companyName}!</h1>
      <p>Hello ${user.name},</p>
      <p>Your account has been approved. You can now log in to the platform.</p>
      <p>
        <a href="${config.frontendLoginUrl}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Log In Now
        </a>
      </p>
      <p style="color: #666;">If you have any questions, please contact us at ${config.companySupportEmail}.</p>
    </body>
    </html>
  `;

  logger.debug(`sendApprovalEmail to="${user.email}"`);

  await sendEmail({
    to: user.email,
    subject: `${config.companyName} - Account Approved`,
    html,
  });
};
