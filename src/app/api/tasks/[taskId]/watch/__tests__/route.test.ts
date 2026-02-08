import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/task-lookup', () => ({ isTaskKey: jest.fn().mockReturnValue(false) }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    task: { findFirst: jest.fn(), update: jest.fn() },
  },
}));

describe('Task Watch API', () => {
  const mockSession = { user: { id: 'user-1', email: 'test@test.com', name: 'Test' } };
  const makeParams = (taskId: string) => ({ params: Promise.resolve({ taskId }) });

  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/tasks/[taskId]/watch', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/watch'), makeParams('task-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if task not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/watch'), makeParams('task-1'));
      expect(res.status).toBe(404);
    });

    it('should return isWatching true when user watches task', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: 'task-1', watchers: [{ id: 'user-1' }] });
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/watch'), makeParams('task-1'));
      expect((await res.json()).isWatching).toBe(true);
    });

    it('should return isWatching false when user does not watch task', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: 'task-1', watchers: [] });
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/watch'), makeParams('task-1'));
      expect((await res.json()).isWatching).toBe(false);
    });

    it('should handle DB errors with 500', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockRejectedValue(new Error('DB'));
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/watch'), makeParams('task-1'));
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/tasks/[taskId]/watch', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await POST(new NextRequest('http://localhost/api/tasks/task-1/watch', { method: 'POST' }), makeParams('task-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if task not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await POST(new NextRequest('http://localhost/api/tasks/task-1/watch', { method: 'POST' }), makeParams('task-1'));
      expect(res.status).toBe(404);
    });

    it('should watch task and return isWatching true', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: 'task-1' });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      const res = await POST(new NextRequest('http://localhost/api/tasks/task-1/watch', { method: 'POST' }), makeParams('task-1'));
      expect((await res.json()).isWatching).toBe(true);
      expect(prisma.task.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { watchers: { connect: { id: 'user-1' } } },
      }));
    });
  });

  describe('DELETE /api/tasks/[taskId]/watch', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await DELETE(new NextRequest('http://localhost/api/tasks/task-1/watch', { method: 'DELETE' }), makeParams('task-1'));
      expect(res.status).toBe(401);
    });

    it('should unwatch task and return isWatching false', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: 'task-1' });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      const res = await DELETE(new NextRequest('http://localhost/api/tasks/task-1/watch', { method: 'DELETE' }), makeParams('task-1'));
      expect((await res.json()).isWatching).toBe(false);
      expect(prisma.task.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { watchers: { disconnect: { id: 'user-1' } } },
      }));
    });
  });
});
