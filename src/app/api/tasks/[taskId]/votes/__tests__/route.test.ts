import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/task-lookup', () => ({ isTaskKey: jest.fn().mockReturnValue(false) }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    task: { findFirst: jest.fn() },
    taskVote: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn(), count: jest.fn() },
    activity: { create: jest.fn() },
    $transaction: jest.fn((promises: Promise<unknown>[]) => Promise.all(promises)),
  },
}));

describe('Task Votes API', () => {
  const mockSession = { user: { id: 'user-1', email: 'test@test.com', name: 'Test' } };
  const makeParams = (taskId: string) => ({ params: Promise.resolve({ taskId }) });

  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/tasks/[taskId]/votes', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/votes'), makeParams('task-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if task not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/votes'), makeParams('task-1'));
      expect(res.status).toBe(404);
    });

    it('should return vote count and hasVoted status', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({
        id: 'task-1', _count: { votes: 3 }, votes: [{ id: 'vote-1' }],
      });
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/votes'), makeParams('task-1'));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.voteCount).toBe(3);
      expect(data.hasVoted).toBe(true);
    });

    it('should return hasVoted false when user has not voted', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({
        id: 'task-1', _count: { votes: 2 }, votes: [],
      });
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/votes'), makeParams('task-1'));
      const data = await res.json();
      expect(data.hasVoted).toBe(false);
    });

    it('should handle DB errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockRejectedValue(new Error('DB'));
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/votes'), makeParams('task-1'));
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/tasks/[taskId]/votes', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await POST(new NextRequest('http://localhost/api/tasks/task-1/votes', { method: 'POST' }), makeParams('task-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if task not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await POST(new NextRequest('http://localhost/api/tasks/task-1/votes', { method: 'POST' }), makeParams('task-1'));
      expect(res.status).toBe(404);
    });

    it('should return 400 if already voted', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: 'task-1', projectId: 'p-1', title: 'T' });
      (prisma.taskVote.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });
      const res = await POST(new NextRequest('http://localhost/api/tasks/task-1/votes', { method: 'POST' }), makeParams('task-1'));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Already voted');
    });

    it('should create vote and return count', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: 'task-1', projectId: 'p-1', title: 'T' });
      (prisma.taskVote.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.taskVote.create as jest.Mock).mockResolvedValue({ id: 'vote-1' });
      (prisma.activity.create as jest.Mock).mockResolvedValue({});
      (prisma.taskVote.count as jest.Mock).mockResolvedValue(5);
      const res = await POST(new NextRequest('http://localhost/api/tasks/task-1/votes', { method: 'POST' }), makeParams('task-1'));
      const data = await res.json();
      expect(data.voteCount).toBe(5);
      expect(data.hasVoted).toBe(true);
    });
  });

  describe('DELETE /api/tasks/[taskId]/votes', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await DELETE(new NextRequest('http://localhost/api/tasks/task-1/votes', { method: 'DELETE' }), makeParams('task-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if task not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await DELETE(new NextRequest('http://localhost/api/tasks/task-1/votes', { method: 'DELETE' }), makeParams('task-1'));
      expect(res.status).toBe(404);
    });

    it('should delete vote and return updated count', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: 'task-1', projectId: 'p-1', title: 'T' });
      (prisma.taskVote.delete as jest.Mock).mockResolvedValue({});
      (prisma.activity.create as jest.Mock).mockResolvedValue({});
      (prisma.taskVote.count as jest.Mock).mockResolvedValue(2);
      const res = await DELETE(new NextRequest('http://localhost/api/tasks/task-1/votes', { method: 'DELETE' }), makeParams('task-1'));
      const data = await res.json();
      expect(data.voteCount).toBe(2);
      expect(data.hasVoted).toBe(false);
    });
  });
});
