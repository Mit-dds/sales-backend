import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  accessToken: {
    secret: process.env.ACCESS_TOKEN_SECRET || 'fallback-access-secret',
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  },
  refreshToken: {
    secret: process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret',
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  resetToken: {
    secret: process.env.RESET_TOKEN_SECRET || 'fallback-reset-secret',
    expiresIn: process.env.RESET_TOKEN_EXPIRES_IN || '10m',
  },
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 465,
    secure: process.env.EMAIL_SECURE !== 'false',
    user: process.env.EMAIL_USER || '',
    appPassword: process.env.EMAIL_APP_PASSWORD || '',
    fromName: process.env.EMAIL_FROM_NAME || 'Property Sales',
  },
 emailjs: {
    serviceId: process.env.EMAILJS_SERVICE_ID || '',
    publicKey: process.env.EMAILJS_PUBLIC_KEY || '',
    privateKey: process.env.EMAILJS_PRIVATE_KEY || '',
    otpTemplateId: process.env.EMAILJS_OTP_TEMPLATE_ID || 'template_i9ox8d8',
    notificationTemplateId: process.env.EMAILJS_NOTIFICATION_TEMPLATE_ID || 'template_0wnup9f',
},
  adminPanelUrl: process.env.ADMIN_PANEL_URL || 'http://localhost:5173/admin',
  frontendLoginUrl: process.env.FRONTEND_LOGIN_URL || 'http://localhost:5173/login',
  database: {
    url: process.env.DATABASE_URL,
  },
};

export default config;
