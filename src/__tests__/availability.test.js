import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';
import jwt from 'jsonwebtoken';

// Mock DB
vi.mock('../config/db.js', () => {
  const mockUserDb = {
    findUnique: vi.fn(),
  };
  const mockProjectDb = {
    findMany: vi.fn(),
  };
  const mockUnitDb = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
  };
  return {
    default: {
      user: mockUserDb,
      project: mockProjectDb,
      unit: mockUnitDb,
    },
  };
});

describe('Availability Integration Tests', () => {
  const adminPayload = { userId: 'admin_uuid_999', role: 'admin', type: 'access' };
  const agentPayload = { userId: 'agent_uuid_777', role: 'agent', type: 'access' };
  const secret = process.env.ACCESS_TOKEN_SECRET || 'test_access_secret';
  
  const adminToken = jwt.sign(adminPayload, secret);
  const agentToken = jwt.sign(agentPayload, secret);

  const mockAdminUser = {
    id: 'admin_uuid_999',
    role: 'admin',
    status: 'ACTIVE',
  };

  const mockAgentUser = {
    id: 'agent_uuid_777',
    role: 'agent',
    status: 'ACTIVE',
  };

  const mockProjectWithUnits = {
    id: 'proj_123',
    name: 'Taormina Village',
    location: 'Dubai Land',
    type: 'Townhouses',
    completionDate: 'Q4 2026',
    primaryColor: '#1A3C6B',
    secondaryColor: '#A8C5E8',
    _count: { units: 5 },
  };

  const mockUnit = {
    id: 'unit_456',
    number: 'RH-06-10',
    projectId: 'proj_123',
    subtype: '3BR',
    floor: 'Ground',
    areaInternal: 1500,
    areaExternal: 200,
    area: 1700,
    price: 1200000,
    isGhost: false,
    createdBy: 'import',
    project: { id: 'proj_123', name: 'Taormina Village' },
    unitType: { id: 'type_123', label: '3BR' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/availability/projects', () => {
    it('returns projects having active unit availabilities', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      prisma.project.findMany.mockResolvedValueOnce([mockProjectWithUnits]);

      const res = await request(app)
        .get('/api/availability/projects')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.projects).toHaveLength(1);
      expect(res.body.data.projects[0].unitCount).toBe(5);
    });

    it('returns empty when no units imported', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      prisma.project.findMany.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/availability/projects')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.projects).toHaveLength(0);
    });

    it('rejects unauthenticated access', async () => {
      const res = await request(app).get('/api/availability/projects');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/availability/:projectId/units', () => {
    it('returns units listed under specified project', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      prisma.unit.findMany.mockResolvedValueOnce([mockUnit]);

      const res = await request(app)
        .get(`/api/availability/${mockProjectWithUnits.id}/units`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.units).toHaveLength(1);
      expect(res.body.data.units[0].number).toBe('RH-06-10');
    });

    it('returns 404 for project with no units', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      prisma.unit.findMany.mockResolvedValueOnce([]);

      const res = await request(app)
        .get(`/api/availability/${mockProjectWithUnits.id}/units`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(404);
    });

    it('rejects unauthenticated access', async () => {
      const res = await request(app)
        .get(`/api/availability/${mockProjectWithUnits.id}/units`);
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/availability', () => {
    it('rejects inventory clearance requests from normal agents', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);

      const res = await request(app)
        .delete('/api/availability')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied. Admin only');
    });

    it('allows database availability deletions for admins', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.unit.deleteMany.mockResolvedValueOnce({ count: 5 });

      const res = await request(app)
        .delete('/api/availability')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('All availability data cleared');
      expect(prisma.unit.deleteMany).toHaveBeenCalled();
    });
  });
});
