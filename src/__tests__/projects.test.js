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
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  };
  const mockUnitTypeDb = {
    findMany: vi.fn(),
  };
  return {
    default: {
      user: mockUserDb,
      project: mockProjectDb,
      unitType: mockUnitTypeDb,
      $transaction: vi.fn((fn) => typeof fn === 'function' ? fn({ user: mockUserDb, project: mockProjectDb, unitType: mockUnitTypeDb }) : Promise.resolve(fn)),
    },
  };
});

// Mock AI service
vi.mock('../services/ai.service.js', () => ({
  generateWhyBuySuggestions: () => Promise.resolve([
    'Prime location in Dubai',
    'Modern interior styling',
    'Easy installments mapping',
    'Vibrant lifestyle hubs',
    'High rental yield potential',
  ]),
}));

describe('Projects Integration Tests', () => {
  const adminPayload = { userId: 'admin_uuid_999', role: 'admin', type: 'access' };
  const agentPayload = { userId: 'agent_uuid_777', role: 'agent', type: 'access' };
  const secret = process.env.ACCESS_TOKEN_SECRET || 'test_access_secret';
  
  const adminToken = jwt.sign(adminPayload, secret);
  const agentToken = jwt.sign(agentPayload, secret);

  const mockAdminUser = {
    id: 'admin_uuid_999',
    name: 'Super Admin',
    role: 'admin',
    status: 'ACTIVE',
  };

  const mockProject = {
    id: 'proj_123',
    name: 'Taormina Village',
    location: 'Dubai Land',
    type: 'Townhouses',
    status: 'OffPlan',
    completionDate: 'Q4 2026',
    unitTypes: [],
    whyBuy: ['Gated community'],
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/projects', () => {
    it('allows access to authenticated agents and returns list', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findMany.mockResolvedValueOnce([mockProject]);
      prisma.project.count.mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.projects).toHaveLength(1);
    });

    it('rejects unauthenticated access', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
    });

    it('returns empty list when no projects exist', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findMany.mockResolvedValueOnce([]);
      prisma.project.count.mockResolvedValueOnce(0);

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.projects).toHaveLength(0);
    });

    it('supports pagination', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findMany.mockResolvedValueOnce([mockProject]);
      prisma.project.count.mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/projects?page=1&limit=10')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(10);
    });

    it('limits page size to 100', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findMany.mockResolvedValueOnce([]);
      prisma.project.count.mockResolvedValueOnce(0);

      const res = await request(app)
        .get('/api/projects?limit=200')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.limit).toBe(100);
    });
  });

  describe('GET /api/projects/:projectId', () => {
    it('returns project by ID', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findUnique.mockResolvedValue(mockProject);

      const res = await request(app)
        .get(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.name).toBe('Taormina Village');
    });

    it('returns 404 for non-existent project', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/projects/nonexistent')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(404);
    });

    it('rejects unauthenticated access', async () => {
      const res = await request(app).get(`/api/projects/${mockProject.id}`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/projects', () => {
    it('rejects project creations from non-admin roles', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'agent_uuid_777',
        role: 'agent',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          name: 'New Project',
          location: 'Dubai',
          type: 'Townhouses',
          status: 'Off-plan',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied. Admin only');
    });

    it('creates project successfully for admins', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.create.mockResolvedValueOnce(mockProject);

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Taormina Village',
          location: 'Dubai Land',
          type: 'Townhouses',
          status: 'Off-plan',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.name).toBe('Taormina Village');
    });

    it('rejects missing name', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          location: 'Dubai Land',
          type: 'Townhouses',
          status: 'Off-plan',
        });

      expect(res.status).toBe(400);
    });

    it('rejects missing location', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Taormina Village',
          type: 'Townhouses',
          status: 'Off-plan',
        });

      expect(res.status).toBe(400);
    });

    it('rejects invalid project type', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Taormina Village',
          location: 'Dubai Land',
          type: 'InvalidType',
          status: 'Off-plan',
        });

      expect(res.status).toBe(400);
    });

    it('rejects invalid status', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Taormina Village',
          location: 'Dubai Land',
          type: 'Townhouses',
          status: 'Completed',
        });

      expect(res.status).toBe(400);
    });

    it('rejects missing required fields', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('normalizes status Off-plan to OffPlan', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.create.mockResolvedValueOnce({
        ...mockProject,
        status: 'OffPlan',
      });

      await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Taormina Village',
          location: 'Dubai Land',
          type: 'Townhouses',
          status: 'Off-plan',
        });

      const createCall = prisma.project.create.mock.calls[0][0];
      expect(createCall.data.status).toBe('OffPlan');
    });

    it('sets defaults for feePct, feeFixed, bookingToken, day7Payment', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.create.mockResolvedValueOnce(mockProject);

      await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Taormina Village',
          location: 'Dubai Land',
          type: 'Townhouses',
          status: 'Off-plan',
        });

      const createCall = prisma.project.create.mock.calls[0][0];
      expect(createCall.data.feePct).toBe(0);
      expect(createCall.data.feeFixed).toBe(0);
      expect(createCall.data.bookingToken).toBe(20000);
      expect(createCall.data.day7Payment).toBe(30000);
    });

    it('rejects unauthenticated access', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({
          name: 'Taormina Village',
          location: 'Dubai Land',
          type: 'Townhouses',
          status: 'Off-plan',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/projects/:projectId/why-buy/ai-suggestions', () => {
    it('returns selling highlights from AI generator', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .get(`/api/projects/${mockProject.id}/why-buy/ai-suggestions`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.suggestions).toHaveLength(5);
    });
  });

  describe('PUT /api/projects/:projectId', () => {
    it('updates project fields', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findUnique.mockResolvedValue(mockProject);
      prisma.project.update.mockResolvedValueOnce({
        ...mockProject,
        name: 'Updated Village',
      });

      const res = await request(app)
        .put(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Village' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.name).toBe('Updated Village');
    });

    it('rejects empty name on update', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .put(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
    });

    it('rejects non-admin on update', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'agent_uuid_777',
        role: 'agent',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .put(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ name: 'Updated Village' });

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent project on update', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/projects/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Village' });

      expect(res.status).toBe(404);
    });

    it('rejects unauthenticated access on update', async () => {
      const res = await request(app)
        .put(`/api/projects/${mockProject.id}`)
        .send({ name: 'Updated Village' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/projects/:projectId', () => {
    it('deletes project for admin', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findUnique
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(mockProject);
      prisma.unitType = { findMany: vi.fn().mockResolvedValue([]) };
      prisma.project.delete.mockResolvedValueOnce(mockProject);

      const res = await request(app)
        .delete(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted');
    });

    it('rejects non-admin on delete', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'agent_uuid_777',
        role: 'agent',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .delete(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent project on delete', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findUnique.mockImplementation(() => Promise.resolve(null));

      const res = await request(app)
        .delete('/api/projects/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('rejects unauthenticated access on delete', async () => {
      const res = await request(app)
        .delete(`/api/projects/${mockProject.id}`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/projects/:projectId/why-buy', () => {
    it('adds why-buy items to project', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findUnique.mockResolvedValue(mockProject);
      prisma.project.update.mockResolvedValueOnce({
        ...mockProject,
        whyBuy: ['Prime location', 'Great ROI'],
      });

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/why-buy`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: ['Prime location', 'Great ROI'] });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('rejects non-array items', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/why-buy`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: 'not an array' });

      expect(res.status).toBe(400);
    });

    it('rejects empty items array', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/why-buy`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [] });

      expect(res.status).toBe(400);
    });

    it('rejects non-admin on why-buy', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'agent_uuid_777',
        role: 'agent',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .post(`/api/projects/${mockProject.id}/why-buy`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ items: ['Prime location'] });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/projects/:projectId/why-buy/:index', () => {
    it('removes a why-buy item by index', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findUnique.mockResolvedValueOnce({
        ...mockProject,
        whyBuy: ['Item 1', 'Item 2', 'Item 3'],
      });
      prisma.project.update.mockResolvedValueOnce({
        ...mockProject,
        whyBuy: ['Item 1', 'Item 3'],
      });

      const res = await request(app)
        .delete(`/api/projects/${mockProject.id}/why-buy/1`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects out-of-bounds index', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findUnique.mockResolvedValueOnce({
        ...mockProject,
        whyBuy: ['Item 1'],
      });

      const res = await request(app)
        .delete(`/api/projects/${mockProject.id}/why-buy/5`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('rejects negative index', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findUnique.mockResolvedValueOnce(mockProject);

      const res = await request(app)
        .delete(`/api/projects/${mockProject.id}/why-buy/-1`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('rejects non-admin on why-buy delete', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'agent_uuid_777',
        role: 'agent',
        status: 'ACTIVE',
      });

      const res = await request(app)
        .delete(`/api/projects/${mockProject.id}/why-buy/0`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/projects/:projectId/why-buy', () => {
    it('returns why-buy items for project', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findUnique.mockImplementation(() =>
        Promise.resolve({ id: mockProject.id, whyBuy: ['Prime location', 'Great ROI'] })
      );

      const res = await request(app)
        .get(`/api/projects/${mockProject.id}/why-buy`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.whyBuy).toEqual(['Prime location', 'Great ROI']);
    });

    it('returns 404 for non-existent project', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.project.findUnique.mockImplementation(() => Promise.resolve(null));

      const res = await request(app)
        .get('/api/projects/nonexistent/why-buy')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(404);
    });
  });
});
