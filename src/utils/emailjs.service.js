import axios from 'axios';
import config from '../config/index.js';
import logger from './logger.js';

const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

const sendEmailJsTemplate = async ({ templateId, templateParams }) => {
  const payload = {
    service_id: config.emailjs.serviceId,
    template_id: templateId,
    user_id: config.emailjs.publicKey,
    accessToken: config.emailjs.privateKey,
    template_params: templateParams,
  };

  const response = await axios.post(EMAILJS_API_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  return response.data;
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

export const buildOtpParams = (user, otpCode) => ({
  to_email: user.email,
  to_name: user.name,
  otp_code: otpCode,
  expiry_minutes: '10',
  app_name: config.companyName,
});

export const buildAdminAlertParams = (user) => ({
  is_admin_alert: 'true',
  company_name: config.companyName,
  company_email: config.companySupportEmail,
  website_link: config.adminPanelUrl,
  user_info_html: `<p><strong>Name:</strong> ${user.name}<br/><strong>Email:</strong> ${user.email}<br/><strong>Phone:</strong> ${user.phone || 'Not provided'}<br/><strong>Registered:</strong> ${formatDate(user.createdAt)}</p>`,
});

export const buildAgentWelcomeParams = (user) => ({
  to_email: user.email,
  to_name: user.name,
  company_name: config.companyName,
  company_email: config.companySupportEmail,
  website_link: config.frontendLoginUrl,
});

export const sendOtpEmail = async (user, otpCode) => {
  let params;
  try {
    logger.debug(`sendOtpEmail user keys=[${Object.keys(user)}] email=${!!user.email} name=${!!user.name}`);
    params = buildOtpParams(user, otpCode);
    logger.debug(`OTP params to_email="${params.to_email}" to_name="${params.to_name}"`);
    await sendEmailJsTemplate({
      templateId: config.emailjs.otpTemplateId,
      templateParams: params,
    });
  } catch (err) {
    logger.error(`sendOtpEmail failed. to_email="${params?.to_email}" to_name="${params?.to_name}"`);
    if (err.response) {
      logger.error(`EmailJS status=${err.response.status} data=${JSON.stringify(err.response.data)}`);
    } else {
      logger.error(`EmailJS error: ${err.message}`);
    }
  }
};

export const sendAdminNotificationEmail = async (adminEmail, user) => {
  let params;
  try {
    params = {
      ...buildAdminAlertParams(user),
      to_email: adminEmail,
      to_name: 'Admin',
    };
    await sendEmailJsTemplate({
      templateId: config.emailjs.notificationTemplateId,
      templateParams: params,
    });
  } catch (err) {
    logger.error(`sendAdminNotificationEmail failed. to_email="${params?.to_email}" to_name="${params?.to_name}"`);
    if (err.response) {
      logger.error(`EmailJS status=${err.response.status} data=${JSON.stringify(err.response.data)}`);
    } else {
      logger.error(`EmailJS error: ${err.message}`);
    }
  }
};

export const sendApprovalEmail = async (user) => {
  let params;
  try {
    params = buildAgentWelcomeParams(user);
    await sendEmailJsTemplate({
      templateId: config.emailjs.notificationTemplateId,
      templateParams: params,
    });
  } catch (err) {
    logger.error(`sendApprovalEmail failed. to_email="${params?.to_email}" to_name="${params?.to_name}"`);
    if (err.response) {
      logger.error(`EmailJS status=${err.response.status} data=${JSON.stringify(err.response.data)}`);
    } else {
      logger.error(`EmailJS error: ${err.message}`);
    }
  }
};
