import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/task-lookup', () => ({ isProjectKey: jest.fn().mockReturnValue(false) }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: { findFirst: jest.fn() },
    projectWebhook: { findMany: jest.fn(), create: jest.fn() },
  },
}));

describe('Webhooks API', () => {
  const mockSession = { user: { id: 'user-1' } };
  const makeParams = (projectId: string) => ({ params: Promise.resolve({ projectId }) });

  beforeEach(() => jest.clearAllMocks());

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/webhooks'), makeParams('p-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if project not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/webhooks'), makeParams('p-1'));
      expect(res.status).toBe(404);
    });

    it('should return webhooks with secrets stripped', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      (prisma.projectWebhook.findMany as jest.Mock).mockResolvedValue([{
        id: 'wh-1', name: 'Hook', url: 'https://example.com', secret: 'my-secret',
        triggers: ['TASK_CREATED'], enabled: true, _count: { deliveries: 5 }, deliveries: [],
      }]);
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/webhooks'), makeParams('p-1'));
      const data = await res.json();
      expect(data.webhooks[0].hasSecret).toBe(true);
      expect(data.webhooks[0].secret).toBeUndefined();
    });
  });

  describe('POST', () => {
    const makeReq = (body: object) => new NextRequest('http://localhost/api/projects/p-1/webhooks', {
      method: 'POST', body: JSON.stringify(body),
    });

    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ name: 'H', url: 'https://example.com', triggers: ['TASK_CREATED'] }), makeParams('p-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if project not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ name: 'H', url: 'https://example.com', triggers: ['TASK_CREATED'] }), makeParams('p-1'));
      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid URL', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      const res = await POST(makeReq({ name: 'H', url: 'not-a-url', triggers: ['TASK_CREATED'] }), makeParams('p-1'));
      expect(res.status).toBe(400);
    });

    it('should return 400 for empty triggers', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      const res = await POST(makeReq({ name: 'H', url: 'https://example.com', triggers: [] }), makeParams('p-1'));
      expect(res.status).toBe(400);
    });

    it('should create webhook and strip secret from response', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      (prisma.projectWebhook.create as jest.Mock).mockResolvedValue({
        id: 'wh-1', name: 'Hook', url: 'https://example.com', secret: 'sec',
        triggers: ['TASK_CREATED'], enabled: true,
      });
      const res = await POST(makeReq({ name: 'Hook', url: 'https://example.com', triggers: ['TASK_CREATED'], secret: 'sec' }), makeParams('p-1'));
      const data = await res.json();
      expect(data.webhook.hasSecret).toBe(true);
      expect(data.webhook.secret).toBeUndefined();
    });
  });
});
