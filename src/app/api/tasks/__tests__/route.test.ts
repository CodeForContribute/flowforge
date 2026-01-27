import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findFirst: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    sprint: {
      findFirst: jest.fn(),
    },
  },
}));

describe('Tasks API', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
    },
  };

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    userId: 'user-1',
  };

  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test description',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    taskType: 'TASK',
    projectId: 'project-1',
    assignee: null,
    sprint: null,
    labels: [],
    parentTask: null,
    _count: { comments: 0, subtasks: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tasks', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/tasks?projectId=project-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if projectId is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/tasks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('projectId is required');
    });

    it('should return 404 if project not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/tasks?projectId=nonexistent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
    });

    it('should return tasks for valid project', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([mockTask]);

      const request = new NextRequest('http://localhost/api/tasks?projectId=project-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tasks).toHaveLength(1);
      expect(data.tasks[0].id).toBe('task-1');
    });

    it('should filter by assignee', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/tasks?projectId=project-1&assignee=user-2');
      await GET(request);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assigneeId: 'user-2',
          }),
        })
      );
    });

    it('should filter by sprint', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/tasks?projectId=project-1&sprint=sprint-1');
      await GET(request);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sprintId: 'sprint-1',
          }),
        })
      );
    });

    it('should filter by noSprint=true', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/tasks?projectId=project-1&noSprint=true');
      await GET(request);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sprintId: null,
          }),
        })
      );
    });

    it('should filter by task type', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/tasks?projectId=project-1&type=BUG');
      await GET(request);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            taskType: 'BUG',
          }),
        })
      );
    });

    it('should filter by status', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/tasks?projectId=project-1&status=IN_PROGRESS');
      await GET(request);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'IN_PROGRESS',
          }),
        })
      );
    });

    it('should filter by priority', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/tasks?projectId=project-1&priority=HIGH');
      await GET(request);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: 'HIGH',
          }),
        })
      );
    });

    it('should filter by search term', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/tasks?projectId=project-1&search=bug');
      await GET(request);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'bug', mode: 'insensitive' } },
              { description: { contains: 'bug', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should filter by labels', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/tasks?projectId=project-1&labels=label-1,label-2');
      await GET(request);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            labels: { some: { id: { in: ['label-1', 'label-2'] } } },
          }),
        })
      );
    });

    it('should filter overdue tasks', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/tasks?projectId=project-1&overdue=true');
      await GET(request);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { lt: expect.any(Date) },
            status: { notIn: ['MERGED', 'CLOSED'] },
          }),
        })
      );
    });

    it('should handle database errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost/api/tasks?projectId=project-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch tasks');
    });
  });

  describe('POST /api/tasks', () => {
    const validTaskData = {
      projectId: 'project-1',
      title: 'New Task',
      description: 'Task description',
    };

    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(validTaskData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for validation errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'project-1' }), // Missing required fields
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 404 if project not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(validTaskData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
    });

    it('should create a task successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.create as jest.Mock).mockResolvedValue({
        ...mockTask,
        ...validTaskData,
      });

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(validTaskData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.task.title).toBe('New Task');
    });

    it('should validate parent task exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...validTaskData,
          parentTaskId: 'nonexistent',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Parent task not found');
    });

    it('should validate task hierarchy', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({
        id: 'parent-1',
        taskType: 'SUBTASK', // EPIC cannot be child of SUBTASK
      });

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...validTaskData,
          taskType: 'EPIC',
          parentTaskId: 'parent-1',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('cannot be a child of');
    });

    it('should validate sprint exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.sprint.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...validTaskData,
          sprintId: 'nonexistent-sprint',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Sprint not found');
    });

    it('should validate assignee is project member', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockProject) // First call for project access
        .mockResolvedValueOnce(null); // Second call for assignee validation

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...validTaskData,
          assigneeId: 'non-member',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Assignee must be a project member');
    });

    it('should create task with all optional fields', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({
        id: 'story-1',
        taskType: 'STORY',
      });
      (prisma.sprint.findFirst as jest.Mock).mockResolvedValue({ id: 'sprint-1' });
      (prisma.task.create as jest.Mock).mockResolvedValue({
        ...mockTask,
        ...validTaskData,
        status: 'TODO',
        priority: 'HIGH',
        taskType: 'TASK',
        storyPoints: 5,
      });

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...validTaskData,
          status: 'TODO',
          priority: 'HIGH',
          taskType: 'TASK',
          storyPoints: 5,
          dueDate: '2024-12-31T00:00:00.000Z',
          parentTaskId: 'story-1',
          sprintId: 'sprint-1',
          labelIds: ['label-1'],
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'TODO',
            priority: 'HIGH',
            taskType: 'TASK',
            storyPoints: 5,
          }),
        })
      );
    });

    it('should handle database errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(validTaskData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create task');
    });

    it('should validate title length', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...validTaskData,
          title: 'A'.repeat(201), // Exceeds 200 char limit
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject empty title', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...validTaskData,
          title: '',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject empty description', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          title: 'Test',
          description: '',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should validate storyPoints range', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...validTaskData,
          storyPoints: 101, // Exceeds max of 100
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
