import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/task-lookup', () => ({ isTaskKey: jest.fn().mockReturnValue(false) }));
jest.mock('@/services/notifications', () => ({
  parseMentions: jest.fn().mockResolvedValue([]),
  notifyMention: jest.fn(),
  notifyWatchersCommentAdded: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    task: { findFirst: jest.fn() },
    comment: { create: jest.fn() },
  },
}));

import { parseMentions, notifyMention, notifyWatchersCommentAdded } from '@/services/notifications';

describe('Comments API', () => {
  const mockSession = { user: { id: 'user-1', name: 'Test User' } };
  const makeParams = (taskId: string) => ({ params: Promise.resolve({ taskId }) });
  const makeReq = (body: object) => new NextRequest('http://localhost/api/tasks/task-1/comments', {
    method: 'POST', body: JSON.stringify(body),
  });

  beforeEach(() => jest.clearAllMocks());

  it('should return 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq({ content: 'Hello' }), makeParams('task-1'));
    expect(res.status).toBe(401);
  });

  it('should return 404 if task not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq({ content: 'Hello' }), makeParams('task-1'));
    expect(res.status).toBe(404);
  });

  it('should return 400 for empty content', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    const res = await POST(makeReq({ content: '' }), makeParams('task-1'));
    expect(res.status).toBe(400);
  });

  it('should create comment successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findFirst as jest.Mock).mockResolvedValue({
      id: 'task-1', title: 'Task', projectId: 'p-1', project: { id: 'p-1', name: 'Project' },
    });
    (prisma.comment.create as jest.Mock).mockResolvedValue({
      id: 'c-1', content: 'Hello', user: { id: 'user-1', name: 'Test' },
    });
    const res = await POST(makeReq({ content: 'Hello' }), makeParams('task-1'));
    expect(res.status).toBe(201);
    expect(parseMentions).toHaveBeenCalledWith('Hello', 'p-1');
    expect(notifyWatchersCommentAdded).toHaveBeenCalled();
  });

  it('should notify mentioned users', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findFirst as jest.Mock).mockResolvedValue({
      id: 'task-1', title: 'Task', projectId: 'p-1', project: { id: 'p-1', name: 'Project' },
    });
    (parseMentions as jest.Mock).mockResolvedValue([{ userId: 'user-2' }]);
    (prisma.comment.create as jest.Mock).mockResolvedValue({
      id: 'c-1', content: '@user2 check this', user: { id: 'user-1' },
    });
    await POST(makeReq({ content: '@user2 check this' }), makeParams('task-1'));
    expect(notifyMention).toHaveBeenCalledWith('user-2', 'Test User', 'task-1', 'Task', 'Project', '@user2 check this');
  });

  it('should not notify the commenter even if mentioned', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findFirst as jest.Mock).mockResolvedValue({
      id: 'task-1', title: 'Task', projectId: 'p-1', project: { id: 'p-1', name: 'Project' },
    });
    (parseMentions as jest.Mock).mockResolvedValue([{ userId: 'user-1' }]);
    (prisma.comment.create as jest.Mock).mockResolvedValue({
      id: 'c-1', content: '@myself', user: { id: 'user-1' },
    });
    await POST(makeReq({ content: '@myself' }), makeParams('task-1'));
    expect(notifyMention).not.toHaveBeenCalled();
  });

  it('should handle DB errors', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.task.findFirst as jest.Mock).mockRejectedValue(new Error('DB'));
    const res = await POST(makeReq({ content: 'Hello' }), makeParams('task-1'));
    expect(res.status).toBe(500);
  });
});
