import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';
import jwt from 'jsonwebtoken';

// Mock DB
vi.mock('../config/db.js', () => ({
  default: {
    user: { findUnique: vi.fn() },
    project: { findUnique: vi.fn(), findMany: vi.fn() },
    unitType: { findMany: vi.fn() },
    $transaction: vi.fn((fn) => fn(prisma)),
  },
}));

// Mock AI service (avoid real Gemini API calls)
vi.mock('../services/ai.service.js', () => ({
  generateWhyBuySuggestions: vi.fn(),
}));

// Mock email service
vi.mock('../utils/resend.service.js', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(true),
  sendAdminNotificationEmail: vi.fn().mockResolvedValue(true),
  sendApprovalEmail: vi.fn().mockResolvedValue(true),
}));

import { generateWhyBuySuggestions } from '../services/ai.service.js';

describe('AI Integration (Gemini) Integration Tests', () => {
  const agentPayload = { userId: 'agent_uuid_777', role: 'agent', type: 'access' };
  const secret = process.env.ACCESS_TOKEN_SECRET || 'test_access_secret';
  const agentToken = jwt.sign(agentPayload, secret);
  const mockAgentUser = { id: 'agent_uuid_777', role: 'agent', status: 'ACTIVE' };

  const projectId = 'proj_123';

  const mockProject = {
    id: projectId,
    name: 'Taormina Village',
    location: 'Al Nahda, Sharjah',
    type: 'Townhouses',
    status: 'OffPlan',
    whyBuy: ['Prime Location', 'Great ROI'],
  };

  const mockAISuggestions = [
    'Strategic location near Dubai border',
    'Exclusive townhouse community with private gardens',
    'Flexible payment plans with 1% monthly',
    'Smart home technology included',
    'Direct developer pricing with no commission',
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/projects/:projectId/why-buy/ai-suggestions', () => {
    it('returns AI-generated suggestions for authenticated user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      generateWhyBuySuggestions.mockResolvedValueOnce(mockAISuggestions);

      const res = await request(app)
        .get(`/api/projects/${projectId}/why-buy/ai-suggestions`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.suggestions).toEqual(mockAISuggestions);
    });

    it('returns fallback suggestions when AI is unavailable', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      const fallback = ['Prime location in the heart of the city', 'World-class amenities'];
      generateWhyBuySuggestions.mockResolvedValueOnce(fallback);

      const res = await request(app)
        .get(`/api/projects/${projectId}/why-buy/ai-suggestions`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.suggestions).toEqual(fallback);
    });

    it('rejects without auth token', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/why-buy/ai-suggestions`);

      expect(res.status).toBe(401);
    });

    it('handles empty project data gracefully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      generateWhyBuySuggestions.mockResolvedValueOnce(['Generic suggestion']);

      const res = await request(app)
        .get(`/api/projects/empty-project/why-buy/ai-suggestions`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns suggestions as an array', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAgentUser);
      generateWhyBuySuggestions.mockResolvedValueOnce(mockAISuggestions);

      const res = await request(app)
        .get(`/api/projects/${projectId}/why-buy/ai-suggestions`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(Array.isArray(res.body.data.suggestions)).toBe(true);
      expect(res.body.data.suggestions.length).toBeGreaterThan(0);
    });
  });
});
