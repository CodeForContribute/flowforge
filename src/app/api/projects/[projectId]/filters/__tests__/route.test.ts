import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: { findFirst: jest.fn() },
    savedFilter: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  },
}));

describe('Saved Filters API', () => {
  const mockSession = { user: { id: 'user-1' } };
  const makeParams = (projectId: string) => ({ params: Promise.resolve({ projectId }) });

  beforeEach(() => jest.clearAllMocks());

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/filters'), makeParams('p-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if project not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/filters'), makeParams('p-1'));
      expect(res.status).toBe(404);
    });

    it('should return filters list', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      (prisma.savedFilter.findMany as jest.Mock).mockResolvedValue([
        { id: 'f-1', name: 'My Filter', filters: {}, isShared: false, user: { id: 'user-1', name: 'Test', image: null } },
      ]);
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/filters'), makeParams('p-1'));
      const data = await res.json();
      expect(data.filters).toHaveLength(1);
    });

    it('should handle DB errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockRejectedValue(new Error('DB'));
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/filters'), makeParams('p-1'));
      expect(res.status).toBe(500);
    });
  });

  describe('POST', () => {
    const makeReq = (body: object) => new NextRequest('http://localhost/api/projects/p-1/filters', {
      method: 'POST', body: JSON.stringify(body),
    });

    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ name: 'F', filters: {} }), makeParams('p-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if project not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ name: 'F', filters: {} }), makeParams('p-1'));
      expect(res.status).toBe(404);
    });

    it('should return 400 for duplicate filter name', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      (prisma.savedFilter.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });
      const res = await POST(makeReq({ name: 'Existing', filters: {} }), makeParams('p-1'));
      expect(res.status).toBe(400);
    });

    it('should create filter successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
      (prisma.savedFilter.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.savedFilter.create as jest.Mock).mockResolvedValue({
        id: 'f-1', name: 'New Filter', filters: { status: ['TODO'] }, isShared: true,
        user: { id: 'user-1', name: 'Test', image: null },
      });
      const res = await POST(makeReq({ name: 'New Filter', filters: { status: ['TODO'] }, isShared: true }), makeParams('p-1'));
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.filter.name).toBe('New Filter');
    });

    it('should return 400 for invalid schema', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      const res = await POST(makeReq({ filters: {} }), makeParams('p-1')); // missing name
      expect(res.status).toBe(400);
    });
  });
});
