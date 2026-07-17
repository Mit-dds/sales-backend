import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';
import jwt from 'jsonwebtoken';

// Mock DB — needs project.findMany and project.count for GET /api/projects
vi.mock('../config/db.js', () => {
  const mockPrisma = {
    user: { findUnique: vi.fn() },
    project: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), create: vi.fn() },
    unitType: { findMany: vi.fn() },
    $transaction: vi.fn((fn) => typeof fn === 'function' ? fn(mockPrisma) : Promise.resolve(fn)),
  };
  return { default: mockPrisma };
});

// Mock email service
vi.mock('../utils/resend.service.js', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(true),
  sendAdminNotificationEmail: vi.fn().mockResolvedValue(true),
  sendApprovalEmail: vi.fn().mockResolvedValue(true),
}));

describe('Middleware and Utilities Integration Tests', () => {
  const secret = process.env.ACCESS_TOKEN_SECRET || 'test_access_secret';
  const mockUser = { id: 'user_uuid_123', role: 'agent', status: 'ACTIVE', name: 'Agent' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── auth.middleware.js ───

  describe('Auth Middleware', () => {
    it('rejects requests without Authorization header', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/no token/i);
    });

    it('rejects requests with invalid token format (no Bearer prefix)', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', 'InvalidTokenNoBearer');

      expect(res.status).toBe(401);
    });

    it('rejects requests with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user_123', role: 'agent', type: 'access' },
        secret,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid|expired/i);
    });

    it('rejects requests with wrong token type (refresh instead of access)', async () => {
      const refreshToken = jwt.sign(
        { userId: 'user_123', role: 'agent', type: 'refresh' },
        secret
      );

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${refreshToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid token type/i);
    });

    it('rejects when user from token is not found in database', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const token = jwt.sign({ userId: 'deleted_user', role: 'agent', type: 'access' }, secret);

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/user not found/i);
    });

    it('passes for valid token and existing user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(0);
      const token = jwt.sign({ userId: 'user_uuid_123', role: 'agent', type: 'access' }, secret);

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('handles malformed JWT (not just expired)', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer not.a.valid.jwt');

      expect(res.status).toBe(401);
    });

    it('rejects token signed with wrong secret', async () => {
      const wrongSecretToken = jwt.sign(
        { userId: 'user_123', role: 'agent', type: 'access' },
        'wrong-secret-key'
      );

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${wrongSecretToken}`);

      expect(res.status).toBe(401);
    });
  });

  // ─── isAdmin.middleware.js ───

  describe('isAdmin Middleware', () => {
    it('rejects non-admin users with 403', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'agent_id', role: 'agent', status: 'ACTIVE' });
      const token = jwt.sign({ userId: 'agent_id', role: 'agent', type: 'access' }, secret);

      // POST /api/projects requires isAdmin
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Project' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/admin only/i);
    });

    it('passes admin users through', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin_id', role: 'admin', status: 'ACTIVE' });
      prisma.project.create.mockResolvedValueOnce({
        id: 'proj_new', name: 'Test', location: 'Dubai', type: 'Townhouses', status: 'OffPlan',
      });
      const token = jwt.sign({ userId: 'admin_id', role: 'admin', type: 'access' }, secret);

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Project', location: 'Dubai', type: 'Townhouses', status: 'Off-plan' });

      expect(res.status).toBe(201);
    });
  });

  // ─── notFound.middleware.js ───

  describe('Not Found Middleware', () => {
    it('returns 404 for unknown API routes', async () => {
      const res = await request(app)
        .get('/api/completely-unknown-route');

      expect(res.status).toBe(404);
    });
  });

  // ─── error.middleware.js ───

  describe('Error Middleware', () => {
    it('returns proper JSON error format on errors', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  // ─── Health check ───

  describe('Health Check', () => {
    it('GET /api/health returns 200', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('running');
    });
  });
});
