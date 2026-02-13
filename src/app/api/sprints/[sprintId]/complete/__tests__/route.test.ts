import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sprint: { findFirst: jest.fn(), update: jest.fn() },
    task: { updateMany: jest.fn() },
  },
}));

describe('Sprint Complete API', () => {
  const mockSession = { user: { id: 'user-1' } };
  const makeParams = (sprintId: string) => ({ params: Promise.resolve({ sprintId }) });
  const makeReq = (body?: object) => new NextRequest('http://localhost/api/sprints/s-1/complete', {
    method: 'POST', body: body ? JSON.stringify(body) : JSON.stringify({}),
  });

  beforeEach(() => jest.clearAllMocks());

  it('should return 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq(), makeParams('s-1'));
    expect(res.status).toBe(401);
  });

  it('should return 404 if sprint not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.sprint.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq(), makeParams('s-1'));
    expect(res.status).toBe(404);
  });

  it('should return 400 if sprint is not ACTIVE', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.sprint.findFirst as jest.Mock).mockResolvedValue({
      id: 's-1', status: 'PLANNING', projectId: 'p-1', tasks: [],
    });
    const res = await POST(makeReq(), makeParams('s-1'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('active sprints');
  });

  it('should complete sprint and move incomplete tasks to backlog', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.sprint.findFirst as jest.Mock).mockResolvedValue({
      id: 's-1', status: 'ACTIVE', projectId: 'p-1',
      tasks: [{ id: 't-1', status: 'IN_PROGRESS' }, { id: 't-2', status: 'MERGED' }],
    });
    (prisma.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.sprint.update as jest.Mock).mockResolvedValue({ id: 's-1', status: 'COMPLETED' });
    const res = await POST(makeReq(), makeParams('s-1'));
    const data = await res.json();
    expect(data.sprint.status).toBe('COMPLETED');
    expect(data.incompleteTasksMoved).toBe(1);
    expect(data.movedTo).toBe('backlog');
    expect(prisma.task.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['t-1'] } },
      data: { sprintId: null },
    });
  });

  it('should move incomplete tasks to next sprint', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.sprint.findFirst as jest.Mock)
      .mockResolvedValueOnce({
        id: 's-1', status: 'ACTIVE', projectId: 'p-1',
        tasks: [{ id: 't-1', status: 'TODO' }],
      })
      .mockResolvedValueOnce({ id: 's-2', status: 'PLANNING' });
    (prisma.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.sprint.update as jest.Mock).mockResolvedValue({ id: 's-1', status: 'COMPLETED' });
    const res = await POST(makeReq({ moveIncompleteTo: 'nextSprint', nextSprintId: 's-2' }), makeParams('s-1'));
    const data = await res.json();
    expect(data.movedTo).toBe('nextSprint');
    expect(prisma.task.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['t-1'] } },
      data: { sprintId: 's-2' },
    });
  });

  it('should return 400 if next sprint not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.sprint.findFirst as jest.Mock)
      .mockResolvedValueOnce({
        id: 's-1', status: 'ACTIVE', projectId: 'p-1',
        tasks: [{ id: 't-1', status: 'TODO' }],
      })
      .mockResolvedValueOnce(null);
    const res = await POST(makeReq({ moveIncompleteTo: 'nextSprint', nextSprintId: 's-missing' }), makeParams('s-1'));
    expect(res.status).toBe(400);
  });

  it('should handle DB errors', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.sprint.findFirst as jest.Mock).mockRejectedValue(new Error('DB'));
    const res = await POST(makeReq(), makeParams('s-1'));
    expect(res.status).toBe(500);
  });
});
