import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    task: { findMany: jest.fn(), updateMany: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
    project: { findFirst: jest.fn() },
    sprint: { findFirst: jest.fn() },
  },
}));

describe('Bulk Operations API', () => {
  const mockSession = { user: { id: 'user-1' } };
  const makeReq = (body: object) => new NextRequest('http://localhost/api/tasks/bulk', {
    method: 'POST', body: JSON.stringify(body),
  });

  beforeEach(() => jest.clearAllMocks());

  it('should return 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq({ taskIds: ['t-1'], action: 'set_status', value: 'TODO' }));
    expect(res.status).toBe(401);
  });

  it('should return 400 for empty taskIds', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    const res = await POST(makeReq({ taskIds: [], action: 'set_status', value: 'TODO' }));
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid action', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    const res = await POST(makeReq({ taskIds: ['t-1'], action: 'invalid' }));
    expect(res.status).toBe(400);
  });

  it('should return 404 if some tasks not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([{ id: 't-1', projectId: 'p-1' }]);
    const res = await POST(makeReq({ taskIds: ['t-1', 't-2'], action: 'set_status', value: 'TODO' }));
    expect(res.status).toBe(404);
  });

  it('should return 400 if tasks from different projects', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([
      { id: 't-1', projectId: 'p-1' }, { id: 't-2', projectId: 'p-2' },
    ]);
    const res = await POST(makeReq({ taskIds: ['t-1', 't-2'], action: 'set_status', value: 'TODO' }));
    expect(res.status).toBe(400);
  });

  it('should set status successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([{ id: 't-1', projectId: 'p-1' }]);
    (prisma.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    const res = await POST(makeReq({ taskIds: ['t-1'], action: 'set_status', value: 'TODO' }));
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.updatedCount).toBe(1);
  });

  it('should set priority successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([{ id: 't-1', projectId: 'p-1' }]);
    (prisma.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    const res = await POST(makeReq({ taskIds: ['t-1'], action: 'set_priority', value: 'HIGH' }));
    expect((await res.json()).success).toBe(true);
  });

  it('should assign tasks and validate project membership', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([{ id: 't-1', projectId: 'p-1' }]);
    (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq({ taskIds: ['t-1'], action: 'assign', value: 'user-2' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Assignee must be a project member');
  });

  it('should unassign tasks', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([{ id: 't-1', projectId: 'p-1' }]);
    (prisma.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    const res = await POST(makeReq({ taskIds: ['t-1'], action: 'unassign' }));
    expect((await res.json()).success).toBe(true);
  });

  it('should add labels to tasks', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([{ id: 't-1', projectId: 'p-1' }]);
    (prisma.task.update as jest.Mock).mockResolvedValue({});
    const res = await POST(makeReq({ taskIds: ['t-1'], action: 'add_labels', value: ['label-1'] }));
    expect((await res.json()).success).toBe(true);
    expect(prisma.task.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { labels: { connect: [{ id: 'label-1' }] } },
    }));
  });

  it('should set sprint with validation', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([{ id: 't-1', projectId: 'p-1' }]);
    (prisma.sprint.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq({ taskIds: ['t-1'], action: 'set_sprint', value: 'sprint-1' }));
    expect(res.status).toBe(404);
  });

  it('should prevent deleting tasks with subtasks', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findMany as jest.Mock)
      .mockResolvedValueOnce([{ id: 't-1', projectId: 'p-1' }])
      .mockResolvedValueOnce([{ id: 't-1', taskKey: 'P-1' }]);
    const res = await POST(makeReq({ taskIds: ['t-1'], action: 'delete' }));
    expect(res.status).toBe(400);
  });

  it('should delete tasks without subtasks', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findMany as jest.Mock)
      .mockResolvedValueOnce([{ id: 't-1', projectId: 'p-1' }])
      .mockResolvedValueOnce([]);
    (prisma.task.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
    const res = await POST(makeReq({ taskIds: ['t-1'], action: 'delete' }));
    expect((await res.json()).success).toBe(true);
  });

  it('should handle DB errors with 500', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findMany as jest.Mock).mockRejectedValue(new Error('DB'));
    const res = await POST(makeReq({ taskIds: ['t-1'], action: 'set_status', value: 'TODO' }));
    expect(res.status).toBe(500);
  });
});
