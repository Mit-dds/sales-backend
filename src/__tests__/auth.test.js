import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock DB
vi.mock('../config/db.js', () => {
  const mockUserDb = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  };
  const mockPasswordResetOtpDb = {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  };
  return {
    default: {
      user: mockUserDb,
      passwordResetOtp: mockPasswordResetOtpDb,
    },
  };
});

// Mock email service
vi.mock('../utils/resend.service.js', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(true),
  sendAdminNotificationEmail: vi.fn().mockResolvedValue(true),
  sendApprovalEmail: vi.fn().mockResolvedValue(true),
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn(),
  },
}));

// Mock OTP generator to return deterministic OTP
vi.mock('../utils/otpGenerator.js', () => ({
  default: vi.fn().mockReturnValue('123456'),
}));

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('creates a user successfully with PENDING status', async () => {
      // Mock user check (does not exist)
      prisma.user.findFirst.mockResolvedValueOnce(null);
      // Mock user creation
      prisma.user.create.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'sarah@example.com',
        phone: '971501234567',
        role: 'agent',
        status: 'PENDING',
      });
      // Mock admin notifications
      prisma.user.findMany.mockResolvedValueOnce([{ email: 'admin@example.com' }]);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sarah Agent',
          email: 'sarah@example.com',
          password: 'Password123!',
          phone: '+971 50 123 4567',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.status).toBe('PENDING');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('rejects duplicate email registrations', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        email: 'sarah@example.com',
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sarah Agent',
          email: 'sarah@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Email already registered');
    });

    it('rejects missing name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'sarah@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects missing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sarah Agent',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects missing password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sarah Agent',
          email: 'sarah@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects short password (less than 6 characters)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sarah Agent',
          email: 'sarah@example.com',
          password: 'abc',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sarah Agent',
          email: 'not-an-email',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('sanitizes phone by stripping non-digits', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'sarah@example.com',
        phone: '971501234567',
        role: 'agent',
        status: 'PENDING',
      });
      prisma.user.findMany.mockResolvedValueOnce([{ email: 'admin@example.com' }]);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sarah Agent',
          email: 'sarah@example.com',
          password: 'Password123!',
          phone: '+971-50-123-4567',
        });

      expect(res.status).toBe(201);
      const createCall = prisma.user.create.mock.calls[0][0];
      expect(createCall.data.phone).toBe('+971501234567');
    });

    it('trims whitespace from name and email', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'PENDING',
      });
      prisma.user.findMany.mockResolvedValueOnce([{ email: 'admin@example.com' }]);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: '  Sarah Agent  ',
          email: '  sarah@example.com  ',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      const createCall = prisma.user.create.mock.calls[0][0];
      expect(createCall.data.name).toBe('Sarah Agent');
      expect(createCall.data.email).toBe('sarah@example.com');
    });

    it('sends admin notification email on successful registration', async () => {
      const { sendAdminNotificationEmail } = await import('../utils/resend.service.js');
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'PENDING',
      });
      prisma.user.findMany.mockResolvedValueOnce([{ email: 'admin@example.com' }]);

      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sarah Agent',
          email: 'sarah@example.com',
          password: 'Password123!',
        });

      expect(sendAdminNotificationEmail).toHaveBeenCalled();
    });

    it('returns 500 when DB create throws error', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockRejectedValueOnce(new Error('DB connection failed'));

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sarah Agent',
          email: 'sarah@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('authenticates active users successfully', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_uuid_123',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'ACTIVE',
        passwordHash: 'hashed_password',
      });
      bcrypt.compare.mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sarah@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('rejects pending status user log-in attempts', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_uuid_123',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'PENDING',
        passwordHash: 'hashed_password',
      });
      bcrypt.compare.mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sarah@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Account pending admin approval');
    });

    it('rejects inactive status users', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_uuid_123',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'INACTIVE',
        passwordHash: 'hashed_password',
      });
      bcrypt.compare.mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sarah@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not active/i);
    });

    it('rejects removed status users', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_uuid_123',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'REMOVED',
        passwordHash: 'hashed_password',
      });
      bcrypt.compare.mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sarah@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(403);
    });

    it('rejects wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_uuid_123',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'ACTIVE',
        passwordHash: 'hashed_password',
      });
      bcrypt.compare.mockResolvedValueOnce(false);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sarah@example.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
    });

    it('rejects non-existent email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
    });

    it('returns both accessToken and refreshToken on success', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_uuid_123',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'ACTIVE',
        passwordHash: 'hashed_password',
      });
      bcrypt.compare.mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sarah@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('rejects missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
    });

    it('rejects missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sarah@example.com',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('refreshes JWT access tokens with valid refresh tokens', async () => {
      const mockUser = {
        id: 'user_uuid_123',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'ACTIVE',
      };
      
      const payload = { userId: mockUser.id, type: 'refresh' };
      const secret = process.env.REFRESH_TOKEN_SECRET || 'test_refresh_secret';
      const refreshToken = jwt.sign(payload, secret);

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('rejects expired refresh token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user_123', type: 'refresh' },
        process.env.REFRESH_TOKEN_SECRET || 'test_refresh_secret',
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredToken });

      expect(res.status).toBe(401);
    });

    it('rejects invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'completely-invalid-token' });

      expect(res.status).toBe(401);
    });

    it('rejects access token used as refresh token', async () => {
      const accessPayload = { userId: 'user_123', type: 'access' };
      const secret = process.env.ACCESS_TOKEN_SECRET || 'test_access_secret';
      const accessToken = jwt.sign(accessPayload, secret);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: accessToken });

      expect(res.status).toBe(401);
    });

    it('rejects refresh token for non-existent user', async () => {
      const payload = { userId: 'deleted_user', type: 'refresh' };
      const secret = process.env.REFRESH_TOKEN_SECRET || 'test_refresh_secret';
      const refreshToken = jwt.sign(payload, secret);

      prisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(401);
    });

    it('rejects refresh token for inactive user', async () => {
      const payload = { userId: 'user_123', type: 'refresh' };
      const secret = process.env.REFRESH_TOKEN_SECRET || 'test_refresh_secret';
      const refreshToken = jwt.sign(payload, secret);

      prisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        status: 'INACTIVE',
      });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(403);
    });

    it('rejects missing refreshToken field', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns unauthorized for calls without headers', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns profile info for authorized credentials', async () => {
      const mockUser = {
        id: 'user_uuid_123',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'ACTIVE',
      };

      const payload = { userId: mockUser.id, email: mockUser.email, role: mockUser.role, type: 'access' };
      const secret = process.env.ACCESS_TOKEN_SECRET || 'test_access_secret';
      const token = jwt.sign(payload, secret);

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('sarah@example.com');
    });

    it('returns 401 for expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user_123', role: 'agent', type: 'access' },
        process.env.ACCESS_TOKEN_SECRET || 'test_access_secret',
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it('returns 401 for tampered token', async () => {
      const token = jwt.sign(
        { userId: 'user_123', role: 'agent', type: 'access' },
        process.env.ACCESS_TOKEN_SECRET || 'test_access_secret'
      );
      const tampered = token.slice(0, -5) + 'XXXXX';

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tampered}`);

      expect(res.status).toBe(401);
    });

    it('returns 401 when user deleted from DB', async () => {
      const payload = { userId: 'deleted_user', role: 'agent', type: 'access' };
      const secret = process.env.ACCESS_TOKEN_SECRET || 'test_access_secret';
      const token = jwt.sign(payload, secret);

      prisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns success on logout', async () => {
      const payload = { userId: 'user_uuid_123', role: 'agent', type: 'access' };
      const secret = process.env.ACCESS_TOKEN_SECRET || 'test_access_secret';
      const token = jwt.sign(payload, secret);
      prisma.user.findUnique.mockResolvedValue({ id: 'user_uuid_123', role: 'agent', status: 'ACTIVE' });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Logged out');
    });

    it('rejects unauthenticated logout', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('sends OTP email for existing user', async () => {
      const user = { id: 'user_uuid_123', email: 'sarah@example.com', name: 'Sarah Agent' };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.passwordResetOtp.deleteMany.mockResolvedValue({ count: 0 });
      prisma.passwordResetOtp.create.mockResolvedValue({ id: 'otp_1', userId: user.id, otp: '123456' });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'sarah@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('OTP has been sent');
    });

    it('returns success even for non-existent email (no info leak)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects missing email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' });

      // Rate limiter (3/15min) may return 429 if preceding tests consumed quota
      expect([400, 429]).toContain(res.status);
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('verifies valid OTP and returns reset token', async () => {
      const user = { id: 'user_uuid_123', email: 'sarah@example.com' };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.passwordResetOtp.findFirst.mockResolvedValue({
        id: 'otp_1',
        userId: user.id,
        otp: '123456',
        used: false,
        expiresAt: new Date(Date.now() + 600000),
      });
      prisma.passwordResetOtp.update.mockResolvedValue({ id: 'otp_1', used: true });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'sarah@example.com', otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resetToken).toBeDefined();
    });

    it('rejects invalid OTP', async () => {
      const user = { id: 'user_uuid_123', email: 'sarah@example.com' };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.passwordResetOtp.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'sarah@example.com', otp: '000000' });

      expect(res.status).toBe(400);
    });

    it('rejects expired OTP', async () => {
      const user = { id: 'user_uuid_123', email: 'sarah@example.com' };
      prisma.user.findUnique.mockResolvedValue(user);
      // Mock findFirst to simulate DB expiry filter — no record matches
      prisma.passwordResetOtp.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'sarah@example.com', otp: '123456' });

      expect(res.status).toBe(400);
    });

    it('rejects missing email', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ otp: '123456' });

      expect(res.status).toBe(400);
    });

    it('rejects missing OTP', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'sarah@example.com' });

      expect(res.status).toBe(400);
    });

    it('rejects non-numeric OTP', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'sarah@example.com', otp: 'abc123' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    const resetSecret = process.env.RESET_TOKEN_SECRET || 'fallback-reset-secret';

    it('resets password with valid reset token', async () => {
      const resetToken = jwt.sign(
        { userId: 'user_uuid_123', type: 'password_reset' },
        resetSecret
      );

      prisma.user.update.mockResolvedValue({ id: 'user_uuid_123' });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ resetToken, newPassword: 'NewPass123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Password reset successful');
    });

    it('rejects short password', async () => {
      const resetToken = jwt.sign(
        { userId: 'user_uuid_123', type: 'password_reset' },
        resetSecret
      );

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ resetToken, newPassword: 'abc' });

      expect(res.status).toBe(400);
    });

    it('rejects missing resetToken', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ newPassword: 'NewPass123!' });

      expect(res.status).toBe(400);
    });

    it('rejects missing newPassword', async () => {
      const resetToken = jwt.sign(
        { userId: 'user_uuid_123', type: 'password_reset' },
        resetSecret
      );

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ resetToken });

      expect(res.status).toBe(400);
    });

    it('rejects invalid reset token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ resetToken: 'invalid-token', newPassword: 'NewPass123!' });

      expect(res.status).toBe(400);
    });

    it('rejects expired reset token', async () => {
      const resetToken = jwt.sign(
        { userId: 'user_uuid_123', type: 'password_reset' },
        resetSecret,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ resetToken, newPassword: 'NewPass123!' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/auth/profile', () => {
    const secret = process.env.ACCESS_TOKEN_SECRET || 'test_access_secret';
    const token = jwt.sign({ userId: 'user_uuid_123', role: 'agent', type: 'access' }, secret);

    it('updates name successfully', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_uuid_123',
        name: 'Old Name',
        role: 'agent',
        status: 'ACTIVE',
      });
      prisma.user.update.mockResolvedValue({
        id: 'user_uuid_123',
        name: 'New Name',
        role: 'agent',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Name');
    });

    it('rejects short name', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_uuid_123',
        role: 'agent',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'A' });

      expect(res.status).toBe(400);
    });

    it('rejects unauthenticated access', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .send({ name: 'New Name' });

      expect(res.status).toBe(401);
    });

    it('updates email successfully', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'old@example.com',
        role: 'agent',
        status: 'ACTIVE',
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'old@example.com',
        role: 'agent',
        status: 'ACTIVE',
      });
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.update.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'new@example.com',
        role: 'agent',
        status: 'ACTIVE',
        phone: null,
        profileEmail: null,
        photo: null,
        watermark: null,
      });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('new@example.com');
    });

    it('rejects email already in use by another user', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'old@example.com',
        role: 'agent',
        status: 'ACTIVE',
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'old@example.com',
        role: 'agent',
        status: 'ACTIVE',
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'other_user',
        email: 'taken@example.com',
      });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'taken@example.com' });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Email already in use');
    });

    it('allows updating to the same email (self)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'ACTIVE',
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'ACTIVE',
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user_uuid_123',
        email: 'sarah@example.com',
      });
      prisma.user.update.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'sarah@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('updates phone successfully', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'ACTIVE',
      });
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.update.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'sarah@example.com',
        phone: '971501234567',
        role: 'agent',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '+971 50 123 4567' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects phone already in use by another user', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'ACTIVE',
      });
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 'other_user',
        phone: '971509998888',
      });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '971509998888' });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Phone number already in use');
    });

    it('updates profileEmail successfully', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'sarah@example.com',
        role: 'agent',
        status: 'ACTIVE',
      });
      prisma.user.update.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Sarah Agent',
        email: 'sarah@example.com',
        profileEmail: 'offers@example.com',
        role: 'agent',
        status: 'ACTIVE',
        phone: null,
        photo: null,
        watermark: null,
      });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ profileEmail: 'offers@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects invalid email format', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('rejects invalid profileEmail format', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ profileEmail: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('rejects short phone number', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '123' });

      expect(res.status).toBe(400);
    });

    it('updates multiple profile fields at once', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Old Name',
        email: 'old@example.com',
        role: 'agent',
        status: 'ACTIVE',
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'Old Name',
        email: 'old@example.com',
        role: 'agent',
        status: 'ACTIVE',
      });
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.update.mockResolvedValueOnce({
        id: 'user_uuid_123',
        name: 'New Name',
        email: 'new@example.com',
        phone: '971501234567',
        profileEmail: 'offers@example.com',
        role: 'agent',
        status: 'ACTIVE',
        photo: null,
        watermark: null,
      });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Name',
          email: 'new@example.com',
          phone: '+971 50 123 4567',
          profileEmail: 'offers@example.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.email).toBe('new@example.com');
    });
  });
});
