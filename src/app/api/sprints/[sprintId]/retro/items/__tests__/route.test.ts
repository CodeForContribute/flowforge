import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sprint: { findFirst: jest.fn() },
    sprintRetroItem: { create: jest.fn() },
  },
}));

describe('Sprint Retro Items API', () => {
  const mockSession = { user: { id: 'user-1' } };
  const makeParams = (sprintId: string) => ({ params: Promise.resolve({ sprintId }) });

  beforeEach(() => jest.clearAllMocks());

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/sprints/s-1/retro/items'), makeParams('s-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if sprint not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.sprint.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/sprints/s-1/retro/items'), makeParams('s-1'));
      expect(res.status).toBe(404);
    });

    it('should return items grouped by type', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.sprint.findFirst as jest.Mock).mockResolvedValue({
        id: 's-1',
        retroItems: [
          { id: 'r-1', type: 'WENT_WELL', content: 'Good', votes: 2, author: { id: 'u-1', name: 'A', image: null } },
          { id: 'r-2', type: 'TO_IMPROVE', content: 'Bad', votes: 1, author: { id: 'u-1', name: 'A', image: null } },
          { id: 'r-3', type: 'ACTION_ITEM', content: 'Do this', votes: 0, author: { id: 'u-1', name: 'A', image: null } },
        ],
      });
      const res = await GET(new NextRequest('http://localhost/api/sprints/s-1/retro/items'), makeParams('s-1'));
      const data = await res.json();
      expect(data.wentWell).toHaveLength(1);
      expect(data.toImprove).toHaveLength(1);
      expect(data.actionItems).toHaveLength(1);
      expect(data.total).toBe(3);
    });
  });

  describe('POST', () => {
    const makeReq = (body: object) => new NextRequest('http://localhost/api/sprints/s-1/retro/items', {
      method: 'POST', body: JSON.stringify(body),
    });

    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ content: 'Test', type: 'WENT_WELL' }), makeParams('s-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if sprint not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.sprint.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ content: 'Test', type: 'WENT_WELL' }), makeParams('s-1'));
      expect(res.status).toBe(404);
    });

    it('should create retro item successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.sprint.findFirst as jest.Mock).mockResolvedValue({ id: 's-1' });
      (prisma.sprintRetroItem.create as jest.Mock).mockResolvedValue({
        id: 'r-1', content: 'Good work', type: 'WENT_WELL',
        author: { id: 'user-1', name: 'Test', image: null },
      });
      const res = await POST(makeReq({ content: 'Good work', type: 'WENT_WELL' }), makeParams('s-1'));
      expect(res.status).toBe(201);
    });

    it('should return 400 for invalid type', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      const res = await POST(makeReq({ content: 'Test', type: 'INVALID' }), makeParams('s-1'));
      expect(res.status).toBe(400);
    });

    it('should return 400 for empty content', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      const res = await POST(makeReq({ content: '', type: 'WENT_WELL' }), makeParams('s-1'));
      expect(res.status).toBe(400);
    });
  });
});
