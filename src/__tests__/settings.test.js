import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';
import jwt from 'jsonwebtoken';

// Mock DB — settings.service uses prisma.settings.findUnique, rates.service uses prisma.fxRate.findFirst
vi.mock('../config/db.js', () => {
  const mockPrisma = {
    user: { findUnique: vi.fn() },
    settings: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    fxRate: { findFirst: vi.fn() },
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

describe('Settings and Currency Integration Tests', () => {
  const adminPayload = { userId: 'admin_uuid_999', role: 'admin', type: 'access' };
  const agentPayload = { userId: 'agent_uuid_777', role: 'agent', type: 'access' };
  const secret = process.env.ACCESS_TOKEN_SECRET || 'test_access_secret';

  const adminToken = jwt.sign(adminPayload, secret);
  const agentToken = jwt.sign(agentPayload, secret);

  const mockAdminUser = { id: 'admin_uuid_999', role: 'admin', status: 'ACTIVE' };
  const mockAgentUser = { id: 'agent_uuid_777', role: 'agent', status: 'ACTIVE' };

  const mockSettings = {
    id: 'settings_1',
    teamName: 'Reportage Sales Team',
    usdRate: 3.6725,
    eurRate: 4.0,
    gbpRate: 4.6,
    inrRate: 0.044,
    rubRate: 0.04,
    audRate: 2.45,
    cadRate: 2.71,
    sarRate: 0.98,
    pkrRate: 0.013,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFxRate = {
    id: 'fx_1',
    base: 'AED',
    rates: { USD: 0.2723, EUR: 0.25 },
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/settings', () => {
    it('returns settings with FX rates for authenticated user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      prisma.settings.findUnique.mockResolvedValue(mockSettings);
      prisma.fxRate.findFirst.mockResolvedValue(mockFxRate);

      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teamName).toBe('Reportage Sales Team');
      expect(res.body.data.fxRates).toBeDefined();
      expect(res.body.data.fxRates.base).toBe('AED');
    });

    it('returns settings with null fxRates if no rates exist', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      prisma.settings.findUnique.mockResolvedValue(mockSettings);
      prisma.fxRate.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.fxRates).toBeNull();
    });

    it('rejects without auth token', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/settings', () => {
    it('updates settings for admin', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      const updatedSettings = { ...mockSettings, teamName: 'New Team Name' };
      prisma.settings.upsert.mockResolvedValue(updatedSettings);

      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ teamName: 'New Team Name', usdRate: 3.6725 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects updates from non-admin agents', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);

      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ teamName: 'Unauthorized Change' });

      expect(res.status).toBe(403);
    });

    it('rejects without auth token', async () => {
      const res = await request(app)
        .put('/api/settings')
        .send({ teamName: 'No Auth' });

      expect(res.status).toBe(401);
    });

    it('upserts settings (creates if not exists)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.settings.upsert.mockResolvedValue({
        ...mockSettings,
        teamName: 'Created Team',
      });

      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ teamName: 'Created Team' });

      expect(res.status).toBe(200);
      expect(prisma.settings.upsert).toHaveBeenCalled();
    });
  });
});
