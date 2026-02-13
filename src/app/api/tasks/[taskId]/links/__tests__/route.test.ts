import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    task: { findUnique: jest.fn() },
    project: { findFirst: jest.fn() },
    taskLink: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  },
}));

describe('Task Links API', () => {
  const mockSession = { user: { id: 'user-1', email: 'test@test.com', name: 'Test' } };
  const mockTask = { id: 'task-1', projectId: 'project-1', project: { id: 'project-1' } };
  const mockTargetTask = { id: 'task-2', projectId: 'project-1' };
  const mockProject = { id: 'project-1' };

  const makeContext = (taskId: string) => ({ params: Promise.resolve({ taskId }) });

  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/tasks/[taskId]/links', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/tasks/task-1/links');
      const res = await GET(req, makeContext('task-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if task not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/links'), makeContext('task-1'));
      expect(res.status).toBe(404);
    });

    it('should return 403 if no project access', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/links'), makeContext('task-1'));
      expect(res.status).toBe(403);
    });

    it('should return formatted links with display types', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.taskLink.findMany as jest.Mock)
        .mockResolvedValueOnce([{
          id: 'link-1', linkType: 'BLOCKS', createdAt: new Date(),
          targetTask: { id: 'task-2', title: 'T2', taskKey: 'P-2', status: 'TODO', taskType: 'TASK' },
        }])
        .mockResolvedValueOnce([{
          id: 'link-2', linkType: 'BLOCKS', createdAt: new Date(),
          sourceTask: { id: 'task-3', title: 'T3', taskKey: 'P-3', status: 'TODO', taskType: 'TASK' },
        }]);

      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/links'), makeContext('task-1'));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.links).toHaveLength(2);
      expect(data.links[0].displayType).toBe('blocks');
      expect(data.links[0].direction).toBe('outward');
      expect(data.links[1].displayType).toBe('is blocked by');
      expect(data.links[1].direction).toBe('inward');
    });

    it('should return empty links when none exist', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.taskLink.findMany as jest.Mock).mockResolvedValue([]);
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/links'), makeContext('task-1'));
      const data = await res.json();
      expect(data.links).toHaveLength(0);
    });

    it('should handle DB errors with 500', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));
      const res = await GET(new NextRequest('http://localhost/api/tasks/task-1/links'), makeContext('task-1'));
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/tasks/[taskId]/links', () => {
    const makeReq = (body: object) => new NextRequest('http://localhost/api/tasks/task-1/links', {
      method: 'POST', body: JSON.stringify(body),
    });

    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ targetTaskId: 'task-2', linkType: 'BLOCKS' }), makeContext('task-1'));
      expect(res.status).toBe(401);
    });

    it('should return 400 for self-linking', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      const res = await POST(makeReq({ targetTaskId: 'task-1', linkType: 'BLOCKS' }), makeContext('task-1'));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe('Cannot link a task to itself');
    });

    it('should return 400 for invalid link type', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      const res = await POST(makeReq({ targetTaskId: 'task-2', linkType: 'INVALID' }), makeContext('task-1'));
      expect(res.status).toBe(400);
    });

    it('should return 404 if source task not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ targetTaskId: 'task-2', linkType: 'BLOCKS' }), makeContext('task-1'));
      expect(res.status).toBe(404);
    });

    it('should return 403 if no project access', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ targetTaskId: 'task-2', linkType: 'BLOCKS' }), makeContext('task-1'));
      expect(res.status).toBe(403);
    });

    it('should return 404 if target task not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce(mockTask).mockResolvedValueOnce(null);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      const res = await POST(makeReq({ targetTaskId: 'task-2', linkType: 'BLOCKS' }), makeContext('task-1'));
      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe('Target task not found');
    });

    it('should return 400 if tasks in different projects', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce({ ...mockTargetTask, projectId: 'project-2' });
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      const res = await POST(makeReq({ targetTaskId: 'task-2', linkType: 'BLOCKS' }), makeContext('task-1'));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Cannot link tasks from different projects');
    });

    it('should return 400 if link already exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce(mockTask).mockResolvedValueOnce(mockTargetTask);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.taskLink.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });
      const res = await POST(makeReq({ targetTaskId: 'task-2', linkType: 'BLOCKS' }), makeContext('task-1'));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Link already exists');
    });

    it('should check both directions for RELATES_TO', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce(mockTask).mockResolvedValueOnce(mockTargetTask);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.taskLink.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.taskLink.create as jest.Mock).mockResolvedValue({
        id: 'link-1', linkType: 'RELATES_TO', createdAt: new Date(),
        targetTask: { id: 'task-2', title: 'T', taskKey: 'P-2', status: 'TODO', taskType: 'TASK' },
      });
      await POST(makeReq({ targetTaskId: 'task-2', linkType: 'RELATES_TO' }), makeContext('task-1'));
      const call = (prisma.taskLink.findFirst as jest.Mock).mock.calls[0][0];
      expect(call.where.OR).toHaveLength(2);
    });

    it('should return 201 with created link', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce(mockTask).mockResolvedValueOnce(mockTargetTask);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.taskLink.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.taskLink.create as jest.Mock).mockResolvedValue({
        id: 'link-1', linkType: 'BLOCKS', createdAt: new Date(),
        targetTask: { id: 'task-2', title: 'T2', taskKey: 'P-2', status: 'TODO', taskType: 'TASK' },
      });
      const res = await POST(makeReq({ targetTaskId: 'task-2', linkType: 'BLOCKS' }), makeContext('task-1'));
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.link.displayType).toBe('blocks');
      expect(data.link.direction).toBe('outward');
    });

    it('should handle DB errors with 500', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.task.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));
      const res = await POST(makeReq({ targetTaskId: 'task-2', linkType: 'BLOCKS' }), makeContext('task-1'));
      expect(res.status).toBe(500);
    });
  });
});
