import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/task-lookup', () => ({ isProjectKey: jest.fn().mockReturnValue(false) }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: { findFirst: jest.fn() },
    slackIntegration: { findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
  },
}));

// Mock global fetch for webhook URL testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Slack Integration API', () => {
  const mockSession = { user: { id: 'user-1', name: 'Test User' } };
  const makeParams = (projectId: string) => ({ params: Promise.resolve({ projectId }) });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/slack'), makeParams('p-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if project not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/slack'), makeParams('p-1'));
      expect(res.status).toBe(404);
    });

    it('should return null integration if none exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      (prisma.slackIntegration.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/slack'), makeParams('p-1'));
      const data = await res.json();
      expect(data.integration).toBeNull();
    });

    it('should return integration settings without exposing webhook URL', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      (prisma.slackIntegration.findUnique as jest.Mock).mockResolvedValue({
        id: 'si-1',
        channelName: '#general',
        enabled: true,
        notifyTaskCreated: true,
        notifyStatusChanged: true,
        notifyPrCreated: true,
        notifyPrMerged: true,
        notifyComments: false,
        accessToken: 'https://hooks.slack.com/services/xxx',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/slack'), makeParams('p-1'));
      const data = await res.json();
      expect(data.integration.channelName).toBe('#general');
      expect(data.integration.hasWebhook).toBe(true);
      expect(data.integration.accessToken).toBeUndefined();
    });

    it('should handle DB errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockRejectedValue(new Error('DB'));
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/slack'), makeParams('p-1'));
      expect(res.status).toBe(500);
    });
  });

  describe('POST', () => {
    const validBody = {
      webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
      channelName: '#general',
    };

    const makeReq = (body: object) => new NextRequest('http://localhost/api/projects/p-1/slack', {
      method: 'POST', body: JSON.stringify(body),
    });

    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq(validBody), makeParams('p-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if project not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      mockFetch.mockResolvedValue({ ok: true });
      const res = await POST(makeReq(validBody), makeParams('p-1'));
      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid webhook URL (not slack)', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      const res = await POST(makeReq({ ...validBody, webhookUrl: 'https://example.com/webhook' }), makeParams('p-1'));
      expect(res.status).toBe(400);
    });

    it('should return 400 for empty channelName', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      const res = await POST(makeReq({ ...validBody, channelName: '' }), makeParams('p-1'));
      expect(res.status).toBe(400);
    });

    it('should return 400 if webhook test fails', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      mockFetch.mockResolvedValue({ ok: false });
      const res = await POST(makeReq(validBody), makeParams('p-1'));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('test message failed');
    });

    it('should return 400 if webhook connection fails', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      mockFetch.mockRejectedValue(new Error('Network error'));
      const res = await POST(makeReq(validBody), makeParams('p-1'));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Could not connect');
    });

    it('should create integration successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      mockFetch.mockResolvedValue({ ok: true });
      (prisma.slackIntegration.upsert as jest.Mock).mockResolvedValue({
        id: 'si-1',
        channelName: '#general',
        enabled: true,
        notifyTaskCreated: true,
        notifyStatusChanged: true,
        notifyPrCreated: true,
        notifyPrMerged: true,
        notifyComments: false,
      });
      const res = await POST(makeReq(validBody), makeParams('p-1'));
      const data = await res.json();
      expect(data.integration.channelName).toBe('#general');
      expect(data.integration.hasWebhook).toBe(true);
    });

    it('should handle DB errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      mockFetch.mockResolvedValue({ ok: true });
      (prisma.slackIntegration.upsert as jest.Mock).mockRejectedValue(new Error('DB'));
      const res = await POST(makeReq(validBody), makeParams('p-1'));
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await DELETE(new NextRequest('http://localhost/api/projects/p-1/slack', { method: 'DELETE' }), makeParams('p-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if project not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await DELETE(new NextRequest('http://localhost/api/projects/p-1/slack', { method: 'DELETE' }), makeParams('p-1'));
      expect(res.status).toBe(404);
    });

    it('should delete integration successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      (prisma.slackIntegration.delete as jest.Mock).mockResolvedValue({});
      const res = await DELETE(new NextRequest('http://localhost/api/projects/p-1/slack', { method: 'DELETE' }), makeParams('p-1'));
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(prisma.slackIntegration.delete).toHaveBeenCalledWith({ where: { projectId: 'p-1' } });
    });

    it('should handle DB errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      (prisma.slackIntegration.delete as jest.Mock).mockRejectedValue(new Error('DB'));
      const res = await DELETE(new NextRequest('http://localhost/api/projects/p-1/slack', { method: 'DELETE' }), makeParams('p-1'));
      expect(res.status).toBe(500);
    });
  });
});
