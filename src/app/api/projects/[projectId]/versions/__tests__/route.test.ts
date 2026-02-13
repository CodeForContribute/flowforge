import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: { findFirst: jest.fn() },
    version: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
  },
}));

describe('Versions API', () => {
  const mockSession = { user: { id: 'user-1' } };
  const makeParams = (projectId: string) => ({ params: Promise.resolve({ projectId }) });

  beforeEach(() => jest.clearAllMocks());

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/versions'), makeParams('p-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if project not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/versions'), makeParams('p-1'));
      expect(res.status).toBe(404);
    });

    it('should return versions with task counts', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      (prisma.version.findMany as jest.Mock).mockResolvedValue([
        { id: 'v-1', name: 'v1.0', status: 'UNRELEASED', _count: { tasks: 5 } },
      ]);
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/versions'), makeParams('p-1'));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0]._count.tasks).toBe(5);
    });

    it('should handle DB errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockRejectedValue(new Error('DB'));
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/versions'), makeParams('p-1'));
      expect(res.status).toBe(500);
    });
  });

  describe('POST', () => {
    const makeReq = (body: object) => new NextRequest('http://localhost/api/projects/p-1/versions', {
      method: 'POST', body: JSON.stringify(body),
    });

    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ name: 'v1.0' }), makeParams('p-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if project not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ name: 'v1.0' }), makeParams('p-1'));
      expect(res.status).toBe(404);
    });

    it('should return 400 for duplicate version name', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      (prisma.version.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });
      const res = await POST(makeReq({ name: 'v1.0' }), makeParams('p-1'));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain('already exists');
    });

    it('should create version with UNRELEASED default status', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      (prisma.version.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.version.create as jest.Mock).mockResolvedValue({
        id: 'v-1', name: 'v1.0', status: 'UNRELEASED', _count: { tasks: 0 },
      });
      const res = await POST(makeReq({ name: 'v1.0' }), makeParams('p-1'));
      expect(res.status).toBe(201);
    });

    it('should return 400 for invalid schema', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      const res = await POST(makeReq({}), makeParams('p-1')); // missing name
      expect(res.status).toBe(400);
    });
  });
});
