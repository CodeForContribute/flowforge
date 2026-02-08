import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    task: { findFirst: jest.fn(), update: jest.fn() },
    timeLog: { findMany: jest.fn(), create: jest.fn() },
  },
}));

describe('Time Logs API', () => {
  const mockSession = { user: { id: 'user-1', email: 'test@test.com', name: 'Test' } };
  const makeParams = (taskId: string) => ({ params: Promise.resolve({ taskId }) });

  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/tasks/[taskId]/time-logs', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/time-logs'), makeParams('task-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if task not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/time-logs'), makeParams('task-1'));
      expect(res.status).toBe(404);
    });

    it('should return time logs with totals', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: 'task-1', originalEstimate: 120, timeRemaining: null });
      (prisma.timeLog.findMany as jest.Mock).mockResolvedValue([
        { id: 'log-1', timeSpent: 30, user: { id: 'user-1', name: 'Test', image: null } },
        { id: 'log-2', timeSpent: 45, user: { id: 'user-1', name: 'Test', image: null } },
      ]);
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/time-logs'), makeParams('task-1'));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.totalTimeSpent).toBe(75);
      expect(data.originalEstimate).toBe(120);
      expect(data.timeRemaining).toBe(45); // 120 - 75
    });

    it('should handle DB errors with 500', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockRejectedValue(new Error('DB'));
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/time-logs'), makeParams('task-1'));
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/tasks/[taskId]/time-logs', () => {
    const makeReq = (body: object) => new NextRequest('http://localhost/api/tasks/task-1/time-logs', {
      method: 'POST', body: JSON.stringify(body),
    });

    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ timeSpent: 30 }), makeParams('task-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if task not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ timeSpent: 30 }), makeParams('task-1'));
      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid timeSpent (too low)', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      const res = await POST(makeReq({ timeSpent: 0 }), makeParams('task-1'));
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid timeSpent (too high)', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      const res = await POST(makeReq({ timeSpent: 1441 }), makeParams('task-1'));
      expect(res.status).toBe(400);
    });

    it('should create time log successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: 'task-1', originalEstimate: null, timeRemaining: null });
      (prisma.timeLog.create as jest.Mock).mockResolvedValue({
        id: 'log-1', timeSpent: 30, user: { id: 'user-1', name: 'Test', image: null },
      });
      const res = await POST(makeReq({ timeSpent: 30, description: 'Worked on it' }), makeParams('task-1'));
      expect(res.status).toBe(201);
    });

    it('should update timeRemaining when originalEstimate exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: 'task-1', originalEstimate: 120, timeRemaining: 120 });
      (prisma.timeLog.create as jest.Mock).mockResolvedValue({ id: 'log-1', timeSpent: 30 });
      (prisma.timeLog.findMany as jest.Mock).mockResolvedValue([{ timeSpent: 30 }, { timeSpent: 20 }]);
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await POST(makeReq({ timeSpent: 30 }), makeParams('task-1'));
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { timeRemaining: 70 }, // 120 - 50
      });
    });

    it('should handle DB errors with 500', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: 'task-1', originalEstimate: null });
      (prisma.timeLog.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const res = await POST(makeReq({ timeSpent: 30 }), makeParams('task-1'));
      expect(res.status).toBe(500);
    });
  });
});
