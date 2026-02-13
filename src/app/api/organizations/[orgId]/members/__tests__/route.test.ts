import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    organizationMember: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

describe('Organization Members API', () => {
  const mockSession = { user: { id: 'user-1' } };
  const makeParams = (orgId: string) => ({ params: Promise.resolve({ orgId }) });

  beforeEach(() => jest.resetAllMocks());

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/organizations/org-1/members'), makeParams('org-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if user is not a member', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/organizations/org-1/members'), makeParams('org-1'));
      expect(res.status).toBe(404);
    });

    it('should return members list', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({ role: 'MEMBER' });
      (prisma.organizationMember.findMany as jest.Mock).mockResolvedValue([
        { id: 'm-1', role: 'OWNER', user: { id: 'user-1', email: 'a@b.com', name: 'A', image: null } },
      ]);
      const res = await GET(new NextRequest('http://localhost/api/organizations/org-1/members'), makeParams('org-1'));
      const data = await res.json();
      expect(data.members).toHaveLength(1);
    });
  });

  describe('POST', () => {
    const makeReq = (body: object) => new NextRequest('http://localhost/api/organizations/org-1/members', {
      method: 'POST', body: JSON.stringify(body),
    });

    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ email: 'a@b.com', role: 'MEMBER' }), makeParams('org-1'));
      expect(res.status).toBe(401);
    });

    it('should return 403 if user is not OWNER or ADMIN', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({ role: 'MEMBER' });
      const res = await POST(makeReq({ email: 'a@b.com', role: 'MEMBER' }), makeParams('org-1'));
      expect(res.status).toBe(403);
    });

    it('should return 403 if non-OWNER tries to add OWNER', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({ role: 'ADMIN' });
      const res = await POST(makeReq({ email: 'a@b.com', role: 'OWNER' }), makeParams('org-1'));
      expect(res.status).toBe(403);
    });

    it('should return 404 if user email not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.organizationMember.findUnique as jest.Mock)
        .mockResolvedValueOnce({ role: 'OWNER' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ email: 'missing@b.com' }), makeParams('org-1'));
      expect(res.status).toBe(404);
    });

    it('should return 400 if user already a member', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.organizationMember.findUnique as jest.Mock)
        .mockResolvedValueOnce({ role: 'OWNER' })
        .mockResolvedValueOnce({ id: 'existing' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-2' });
      const res = await POST(makeReq({ email: 'a@b.com' }), makeParams('org-1'));
      expect(res.status).toBe(400);
    });

    it('should add member successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.organizationMember.findUnique as jest.Mock)
        .mockResolvedValueOnce({ role: 'OWNER' })
        .mockResolvedValueOnce(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-2' });
      (prisma.organizationMember.create as jest.Mock).mockResolvedValue({
        id: 'm-1', role: 'MEMBER', user: { id: 'user-2', email: 'a@b.com', name: 'B', image: null },
      });
      const res = await POST(makeReq({ email: 'a@b.com', role: 'MEMBER' }), makeParams('org-1'));
      expect(res.status).toBe(201);
    });
  });
});
