import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';
import jwt from 'jsonwebtoken';

// Mock DB
vi.mock('../config/db.js', () => {
  const mockPrisma = {
    user: { findUnique: vi.fn() },
    offer: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
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

describe('Offers Integration Tests', () => {
  const adminPayload = { userId: 'admin_uuid_999', role: 'admin', type: 'access' };
  const agentPayload = { userId: 'agent_uuid_777', role: 'agent', type: 'access' };
  const secret = process.env.ACCESS_TOKEN_SECRET || 'test_access_secret';

  const adminToken = jwt.sign(adminPayload, secret);
  const agentToken = jwt.sign(agentPayload, secret);

  const mockAdminUser = { id: 'admin_uuid_999', role: 'admin', status: 'ACTIVE', name: 'Admin' };
  const mockAgentUser = { id: 'agent_uuid_777', role: 'agent', status: 'ACTIVE', name: 'Test Agent', email: 'agent@test.com' };

  const validOfferBody = {
    clientName: 'John Doe',
    projectName: 'Taormina Village',
    unitNumber: 'RH-06-10',
    planLabel: '10% DP + 1% Monthly',
    listPrice: 1500000,
    netPrice: 1425000,
    offerMode: 'single',
    schedule: JSON.stringify([{ milestone: 'Booking', percentage: 10, amount: 142500 }]),
    fees: JSON.stringify({ dld: 4, oqoodWaiver: false }),
  };

  const mockOffer = {
    id: 'offer_123',
    ...validOfferBody,
    agentId: 'agent_uuid_777',
    agentName: 'Test Agent',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/offers', () => {
    it('creates an offer for authenticated agent', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      prisma.offer.create.mockResolvedValue(mockOffer);

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(validOfferBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('offer_123');
    });

    it('rejects without auth token', async () => {
      const res = await request(app)
        .post('/api/offers')
        .send(validOfferBody);

      expect(res.status).toBe(401);
    });

    it('rejects if required fields are missing (no clientName)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      const { clientName, ...bodyWithoutClient } = validOfferBody;

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(bodyWithoutClient);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects if required fields are missing (no netPrice)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      const { netPrice, ...bodyWithoutPrice } = validOfferBody;

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(bodyWithoutPrice);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects if projectName is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      const { projectName, ...bodyWithoutProject } = validOfferBody;

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(bodyWithoutProject);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects if unitNumber is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      const { unitNumber, ...bodyWithoutUnit } = validOfferBody;

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(bodyWithoutUnit);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects if planLabel is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      const { planLabel, ...bodyWithoutPlan } = validOfferBody;

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(bodyWithoutPlan);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects if listPrice is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      const { listPrice, ...bodyWithoutListPrice } = validOfferBody;

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(bodyWithoutListPrice);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('auto-sets agentId and agentName from token', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      prisma.offer.create.mockResolvedValue(mockOffer);

      await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(validOfferBody);

      const createCall = prisma.offer.create.mock.calls[0][0];
      expect(createCall.data.agentId).toBe('agent_uuid_777');
      expect(createCall.data.agentName).toBe('Test Agent');
    });
  });

  describe('GET /api/offers', () => {
    it('returns paginated offers for admin', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.offer.findMany.mockResolvedValue([mockOffer]);
      prisma.offer.count
        .mockResolvedValueOnce(1)   // total
        .mockResolvedValueOnce(1)   // thisMonth
        .mockResolvedValueOnce(1)   // singleOffers
        .mockResolvedValueOnce(0);  // multiPlanOffers

      const res = await request(app)
        .get('/api/offers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('offers');
      expect(res.body.data).toHaveProperty('pagination');
      expect(res.body.data).toHaveProperty('stats');
    });

    it('returns only own offers for agent role', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      prisma.offer.findMany.mockResolvedValue([mockOffer]);
      prisma.offer.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);

      const res = await request(app)
        .get('/api/offers')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects without auth token', async () => {
      const res = await request(app).get('/api/offers');
      expect(res.status).toBe(401);
    });

    it('returns empty list when no offers exist', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.offer.findMany.mockResolvedValue([]);
      prisma.offer.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const res = await request(app)
        .get('/api/offers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.offers).toHaveLength(0);
    });

    it('supports search by client name', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.offer.findMany.mockResolvedValue([mockOffer]);
      prisma.offer.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);

      const res = await request(app)
        .get('/api/offers?search=John')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
