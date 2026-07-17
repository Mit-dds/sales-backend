import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';
import jwt from 'jsonwebtoken';

// Mock DB — must include ALL models that any service touched in these routes might access
vi.mock('../config/db.js', () => {
  const mockPrisma = {
    user: { findUnique: vi.fn() },
    unitType: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    subType: { findMany: vi.fn(), create: vi.fn(), createMany: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    paymentPlan: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    project: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
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

describe('Unit Types and Payment Plans Integration Tests', () => {
  const adminPayload = { userId: 'admin_uuid_999', role: 'admin', type: 'access' };
  const agentPayload = { userId: 'agent_uuid_777', role: 'agent', type: 'access' };
  const secret = process.env.ACCESS_TOKEN_SECRET || 'test_access_secret';

  const adminToken = jwt.sign(adminPayload, secret);
  const agentToken = jwt.sign(agentPayload, secret);

  const mockAdminUser = { id: 'admin_uuid_999', role: 'admin', status: 'ACTIVE' };
  const mockAgentUser = { id: 'agent_uuid_777', role: 'agent', status: 'ACTIVE' };
  const projectId = 'proj_123';
  const unitTypeId = 'ut_456';

  const mockProject = { id: projectId, name: 'Taormina Village' };

  const mockUnitType = {
    id: unitTypeId,
    projectId,
    label: '3BR',
    virtualTour: null,
    createdAt: new Date(),
    subtypes: [{ label: 'Type A', floorPlanPath: null, createdAt: new Date() }],
    paymentPlans: [{ id: 'pp_1', label: '10% DP', planType: 'normal', dp: 10, installmentPct: 1, createdAt: new Date() }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/projects/:projectId/unit-types', () => {
    it('rejects access from non-admin agents', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);

      const res = await request(app)
        .get(`/api/projects/${projectId}/unit-types`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(403);
    });

    it('returns list of unit types for admin', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findUnique.mockResolvedValue(mockProject);
      prisma.unitType.findMany.mockResolvedValue([mockUnitType]);

      const res = await request(app)
        .get(`/api/projects/${projectId}/unit-types`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unitTypes).toHaveLength(1);
    });

    it('returns 404 when project not found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/projects/${projectId}/unit-types`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('returns empty array when no unit types exist', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findUnique.mockResolvedValue(mockProject);
      prisma.unitType.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/projects/${projectId}/unit-types`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.unitTypes).toHaveLength(0);
    });

    it('rejects unauthenticated access', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/unit-types`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/projects/:projectId/unit-types/:unitTypeId/payment-plans/templates', () => {
    it('returns 7 pre-built payment plan templates for admin', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .get(`/api/projects/${projectId}/unit-types/${unitTypeId}/payment-plans/templates`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.templates).toBeDefined();
      expect(Array.isArray(res.body.data.templates)).toBe(true);
      expect(res.body.data.templates.length).toBe(7);
    });
  });

  describe('DELETE /api/projects/:projectId/unit-types/:unitTypeId', () => {
    it('rejects deletions from non-admin agents', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);

      const res = await request(app)
        .delete(`/api/projects/${projectId}/unit-types/${unitTypeId}`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(403);
    });
  });
});
