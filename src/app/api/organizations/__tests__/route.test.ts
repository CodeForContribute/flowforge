import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockTx = {
  organization: { create: jest.fn() },
  organizationMember: { create: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    organization: { findMany: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
  },
}));

describe('Organizations API', () => {
  const mockSession = { user: { id: 'user-1' } };

  beforeEach(() => jest.clearAllMocks());

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('should return organizations with user role', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.organization.findMany as jest.Mock).mockResolvedValue([{
        id: 'org-1', name: 'My Org', slug: 'my-org',
        _count: { members: 3, projects: 2 },
        members: [{ role: 'OWNER' }],
      }]);
      const res = await GET();
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.organizations[0].userRole).toBe('OWNER');
      expect(data.organizations[0].members).toBeUndefined();
    });

    it('should handle DB errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.organization.findMany as jest.Mock).mockRejectedValue(new Error('DB'));
      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  describe('POST', () => {
    const makeReq = (body: object) => new NextRequest('http://localhost/api/organizations', {
      method: 'POST', body: JSON.stringify(body),
    });

    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ name: 'Org' }));
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid slug format', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      const res = await POST(makeReq({ name: 'Org', slug: 'INVALID_SLUG!' }));
      expect(res.status).toBe(400);
    });

    it('should return 400 if slug already in use', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });
      const res = await POST(makeReq({ name: 'Org', slug: 'taken-slug' }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain('already in use');
    });

    it('should create org with provided slug', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
      const mockOrg = { id: 'org-1', name: 'My Org', slug: 'my-org' };
      mockTx.organization.create.mockResolvedValue(mockOrg);
      mockTx.organizationMember.create.mockResolvedValue({});
      const res = await POST(makeReq({ name: 'My Org', slug: 'my-org' }));
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.organization.slug).toBe('my-org');
    });

    it('should auto-generate slug when not provided', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
      const mockOrg = { id: 'org-1', name: 'My Org', slug: 'my-org' };
      mockTx.organization.create.mockResolvedValue(mockOrg);
      mockTx.organizationMember.create.mockResolvedValue({});
      const res = await POST(makeReq({ name: 'My Org' }));
      expect(res.status).toBe(201);
    });

    it('should add creator as OWNER', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
      mockTx.organization.create.mockResolvedValue({ id: 'org-1' });
      mockTx.organizationMember.create.mockResolvedValue({});
      await POST(makeReq({ name: 'Org' }));
      expect(mockTx.organizationMember.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ role: 'OWNER', userId: 'user-1' }),
      }));
    });
  });
});
