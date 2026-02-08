import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/task-lookup', () => ({ isProjectKey: jest.fn().mockReturnValue(false) }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: { findFirst: jest.fn() },
    activity: { findMany: jest.fn() },
  },
}));

describe('Activity Stream API', () => {
  const mockSession = { user: { id: 'user-1' } };
  const makeParams = (projectId: string) => ({ params: Promise.resolve({ projectId }) });

  beforeEach(() => jest.clearAllMocks());

  it('should return 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/projects/p-1/activities'), makeParams('p-1'));
    expect(res.status).toBe(401);
  });

  it('should return 404 if project not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/projects/p-1/activities'), makeParams('p-1'));
    expect(res.status).toBe(404);
  });

  it('should return activities with pagination', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
    const activities = Array.from({ length: 3 }, (_, i) => ({
      id: `act-${i}`, type: 'TASK_CREATED', description: `Activity ${i}`,
      user: { id: 'user-1', name: 'Test', image: null },
      task: { id: `t-${i}`, title: `Task ${i}`, taskKey: `P-${i}` },
      createdAt: new Date(),
    }));
    (prisma.activity.findMany as jest.Mock).mockResolvedValue(activities);
    const res = await GET(new NextRequest('http://localhost/api/projects/p-1/activities'), makeParams('p-1'));
    const data = await res.json();
    expect(data.activities).toHaveLength(3);
    expect(data.hasMore).toBe(false);
  });

  it('should support cursor-based pagination', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
    (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
    await GET(new NextRequest('http://localhost/api/projects/p-1/activities?cursor=act-5&limit=10'), makeParams('p-1'));
    expect(prisma.activity.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 11, cursor: { id: 'act-5' }, skip: 1,
    }));
  });

  it('should support taskId filter', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p-1' });
    (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);
    await GET(new NextRequest('http://localhost/api/projects/p-1/activities?taskId=t-1'), makeParams('p-1'));
    expect(prisma.activity.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ taskId: 't-1' }),
    }));
  });

  it('should handle DB errors', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.project.findFirst as jest.Mock).mockRejectedValue(new Error('DB'));
    const res = await GET(new NextRequest('http://localhost/api/projects/p-1/activities'), makeParams('p-1'));
    expect(res.status).toBe(500);
  });
});
