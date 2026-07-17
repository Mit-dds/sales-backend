import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';
import jwt from 'jsonwebtoken';

// Mock DB
vi.mock('../config/db.js', () => {
  const mockUserDb = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  };
  return {
    default: {
      user: mockUserDb,
    },
  };
});

// Mock email service
vi.mock('../utils/resend.service.js', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(true),
  sendAdminNotificationEmail: vi.fn().mockResolvedValue(true),
  sendApprovalEmail: vi.fn().mockResolvedValue(true),
}));

describe('Admin User Management Integration Tests', () => {
  const adminPayload = { userId: 'admin_uuid_999', role: 'admin', type: 'access' };
  const agentPayload = { userId: 'agent_uuid_777', role: 'agent', type: 'access' };
  const secret = process.env.ACCESS_TOKEN_SECRET || 'test_access_secret';
  
  const adminToken = jwt.sign(adminPayload, secret);
  const agentToken = jwt.sign(agentPayload, secret);

  const mockAdminUser = {
    id: 'admin_uuid_999',
    name: 'Super Admin',
    email: 'admin@example.com',
    role: 'admin',
    status: 'ACTIVE',
  };

  const mockAgentUser = {
    id: 'agent_uuid_777',
    name: 'Sarah Agent',
    email: 'sarah@example.com',
    role: 'agent',
    status: 'PENDING',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('rejects access from normal agent roles', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied. Admin only');
    });

    it('returns paginated users list for admin roles', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.user.findMany.mockResolvedValueOnce([mockAdminUser, mockAgentUser]);
      prisma.user.count.mockResolvedValueOnce(2);

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toHaveLength(2);
      expect(res.body.data.pagination.total).toBe(2);
    });

    it('rejects unauthenticated access', async () => {
      const res = await request(app).get('/api/admin/users');
      expect(res.status).toBe(401);
    });

    it('returns empty array when no users match', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.user.findMany.mockResolvedValueOnce([]);
      prisma.user.count.mockResolvedValueOnce(0);

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users).toHaveLength(0);
    });

    it('supports search by name/email', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.user.findMany.mockResolvedValueOnce([mockAgentUser]);
      prisma.user.count.mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/admin/users?search=Sarah')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users).toHaveLength(1);
    });

    it('supports status filter', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.user.findMany.mockResolvedValueOnce([{ ...mockAgentUser, status: 'ACTIVE' }]);
      prisma.user.count.mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/admin/users?status=ACTIVE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('supports pagination (page and limit)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.user.findMany.mockResolvedValueOnce([mockAgentUser]);
      prisma.user.count.mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(5);
    });

    it('handles limit=1 (minimum)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.user.findMany.mockResolvedValueOnce([mockAdminUser]);
      prisma.user.count.mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/admin/users?limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.limit).toBe(1);
    });

    it('handles limit=100 (maximum)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      const manyUsers = Array.from({ length: 100 }, (_, i) => ({ ...mockAgentUser, id: `user_${i}`, email: `agent${i}@test.com` }));
      prisma.user.findMany.mockResolvedValueOnce(manyUsers);
      prisma.user.count.mockResolvedValueOnce(100);

      const res = await request(app)
        .get('/api/admin/users?limit=100')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('rejects limit>100', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .get('/api/admin/users?limit=101')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('rejects page<1 (negative page)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .get('/api/admin/users?page=-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('defaults page=0 to page=1', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.user.findMany.mockResolvedValueOnce([]);
      prisma.user.count.mockResolvedValueOnce(0);

      const res = await request(app)
        .get('/api/admin/users?page=0')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.page).toBe(1);
    });
  });

  describe('GET /api/admin/users/:userId', () => {
    it('returns user profile for admin', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)
        .mockResolvedValueOnce(mockAgentUser);

      const res = await request(app)
        .get(`/api/admin/users/${mockAgentUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('sarah@example.com');
    });

    it('returns 404 for non-existent user', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)
        .mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/admin/users/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('rejects non-admin access', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);

      const res = await request(app)
        .get(`/api/admin/users/${mockAdminUser.id}`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated access', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${mockAdminUser.id}`);

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/admin/users/:userId/status', () => {
    it('prevents admins from deactivating their own accounts', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .patch(`/api/admin/users/${mockAdminUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('You cannot deactivate or remove your own account');
    });

    it('updates user status and sends approval email when status changes to ACTIVE', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)
        .mockResolvedValueOnce(mockAgentUser);

      prisma.user.update.mockResolvedValueOnce({
        ...mockAgentUser,
        status: 'ACTIVE',
      });

      const res = await request(app)
        .patch(`/api/admin/users/${mockAgentUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.status).toBe('ACTIVE');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('rejects unauthenticated access', async () => {
      const res = await request(app)
        .patch('/api/admin/users/some-id/status')
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(401);
    });

    it('rejects non-admin trying to update status', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);

      const res = await request(app)
        .patch('/api/admin/users/some-id/status')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent user', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)
        .mockResolvedValueOnce(null);

      const res = await request(app)
        .patch('/api/admin/users/nonexistent/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(404);
    });

    it('updates user status to INACTIVE', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)
        .mockResolvedValueOnce(mockAgentUser);

      prisma.user.update.mockResolvedValueOnce({
        ...mockAgentUser,
        status: 'INACTIVE',
      });

      const res = await request(app)
        .patch(`/api/admin/users/${mockAgentUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.status).toBe('INACTIVE');
    });

    it('updates user status to REMOVED', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockAdminUser)
        .mockResolvedValueOnce(mockAgentUser);

      prisma.user.update.mockResolvedValueOnce({
        ...mockAgentUser,
        status: 'REMOVED',
      });

      const res = await request(app)
        .patch(`/api/admin/users/${mockAgentUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'REMOVED' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.status).toBe('REMOVED');
    });

    it('rejects invalid status value', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .patch(`/api/admin/users/${mockAgentUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
    });

    it('rejects empty status body', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .patch(`/api/admin/users/${mockAgentUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
