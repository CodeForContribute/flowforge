import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sprint: { findFirst: jest.fn(), update: jest.fn() },
  },
}));

describe('Sprint Start API', () => {
  const mockSession = { user: { id: 'user-1' } };
  const makeParams = (sprintId: string) => ({ params: Promise.resolve({ sprintId }) });

  beforeEach(() => jest.clearAllMocks());

  it('should return 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(new NextRequest('http://localhost/api/sprints/s-1/start', { method: 'POST' }), makeParams('s-1'));
    expect(res.status).toBe(401);
  });

  it('should return 404 if sprint not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.sprint.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(new NextRequest('http://localhost/api/sprints/s-1/start', { method: 'POST' }), makeParams('s-1'));
    expect(res.status).toBe(404);
  });

  it('should return 400 if sprint is not in PLANNING status', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.sprint.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 's-1', status: 'ACTIVE', projectId: 'p-1', project: { id: 'p-1' },
    });
    const res = await POST(new NextRequest('http://localhost/api/sprints/s-1/start', { method: 'POST' }), makeParams('s-1'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('PLANNING');
  });

  it('should return 400 if there is already an active sprint', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.sprint.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: 's-1', status: 'PLANNING', projectId: 'p-1', project: { id: 'p-1' } })
      .mockResolvedValueOnce({ id: 's-2', status: 'ACTIVE' });
    const res = await POST(new NextRequest('http://localhost/api/sprints/s-1/start', { method: 'POST' }), makeParams('s-1'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('already an active sprint');
  });

  it('should start sprint successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.sprint.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: 's-1', status: 'PLANNING', projectId: 'p-1', project: { id: 'p-1' } })
      .mockResolvedValueOnce(null);
    (prisma.sprint.update as jest.Mock).mockResolvedValue({ id: 's-1', status: 'ACTIVE' });
    const res = await POST(new NextRequest('http://localhost/api/sprints/s-1/start', { method: 'POST' }), makeParams('s-1'));
    const data = await res.json();
    expect(data.sprint.status).toBe('ACTIVE');
  });

  it('should handle DB errors', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.sprint.findFirst as jest.Mock).mockRejectedValue(new Error('DB'));
    const res = await POST(new NextRequest('http://localhost/api/sprints/s-1/start', { method: 'POST' }), makeParams('s-1'));
    expect(res.status).toBe(500);
  });
});
