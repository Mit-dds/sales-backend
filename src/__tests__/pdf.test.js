import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';
import jwt from 'jsonwebtoken';

// Mock DB — pdf.controller calls settingsService.getSettings() which uses prisma.settings.findUnique
vi.mock('../config/db.js', () => {
  const mockPrisma = {
    user: { findUnique: vi.fn() },
    settings: { findUnique: vi.fn(), create: vi.fn() },
    $transaction: vi.fn((fn) => typeof fn === 'function' ? fn(mockPrisma) : Promise.resolve(fn)),
  };
  return { default: mockPrisma };
});

// Mock pdf service (Puppeteer is heavy, mock it)
vi.mock('../services/pdf.service.js', () => ({
  renderTemplate: vi.fn().mockResolvedValue('<html><body>Mock PDF</body></html>'),
  generatePdf: vi.fn().mockResolvedValue(Buffer.from('fake-pdf-content')),
  closeBrowser: vi.fn(),
}));

// Mock email service
vi.mock('../utils/resend.service.js', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(true),
  sendAdminNotificationEmail: vi.fn().mockResolvedValue(true),
  sendApprovalEmail: vi.fn().mockResolvedValue(true),
}));

describe('PDF Generation Integration Tests', () => {
  const agentPayload = { userId: 'agent_uuid_777', role: 'agent', type: 'access' };
  const secret = process.env.ACCESS_TOKEN_SECRET || 'test_access_secret';
  const agentToken = jwt.sign(agentPayload, secret);
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
  };

  const validPdfBody = {
    template: 'single-offer',
    format: 'A4',
    offerData: {
      clientName: 'John Doe',
      agentName: 'Sarah Agent',
      project: { name: 'Taormina Village' },
      unit: { number: 'RH-06-10', type: '3BR' },
      plan: { label: '10% DP' },
      schedule: [{ milestone: 'Booking', percentage: 10, amount: 150000 }],
      fees: { dld: 4 },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/pdf/generate', () => {
    it('generates a PDF download for authenticated user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      prisma.settings.findUnique.mockResolvedValue(mockSettings);

      const res = await request(app)
        .post('/api/pdf/generate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(validPdfBody);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
    });

    it('rejects without auth token', async () => {
      const res = await request(app)
        .post('/api/pdf/generate')
        .send(validPdfBody);

      expect(res.status).toBe(401);
    });

    it('rejects when offerData is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);

      const res = await request(app)
        .post('/api/pdf/generate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ template: 'single-offer', format: 'A4' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects when template is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);

      const res = await request(app)
        .post('/api/pdf/generate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ offerData: validPdfBody.offerData, format: 'A4' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid template name', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);

      const res = await request(app)
        .post('/api/pdf/generate')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ ...validPdfBody, template: 'invalid-template' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/pdf/preview', () => {
    it('returns base64 encoded PDF for preview', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      prisma.settings.findUnique.mockResolvedValue(mockSettings);

      const res = await request(app)
        .post('/api/pdf/preview')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(validPdfBody);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data).toBe('string'); // base64 string
    });

    it('rejects without auth token', async () => {
      const res = await request(app)
        .post('/api/pdf/preview')
        .send(validPdfBody);

      expect(res.status).toBe(401);
    });

    it('rejects when offerData is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);

      const res = await request(app)
        .post('/api/pdf/preview')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ template: 'single-offer' });

      expect(res.status).toBe(400);
    });

    it('rejects invalid template name', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);

      const res = await request(app)
        .post('/api/pdf/preview')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ ...validPdfBody, template: 'bad-template' });

      expect(res.status).toBe(400);
    });
  });
});
