import { NextRequest } from 'next/server';
import { GET, POST, PATCH, DELETE } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: { findFirst: jest.fn(), update: jest.fn() },
    task: { findMany: jest.fn(), update: jest.fn() },
  },
}));

describe('Custom Fields API', () => {
  const mockSession = { user: { id: 'user-1' } };
  const makeParams = (projectId: string) => ({ params: Promise.resolve({ projectId }) });

  beforeEach(() => jest.clearAllMocks());

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/custom-fields'), makeParams('p-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if project not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/custom-fields'), makeParams('p-1'));
      expect(res.status).toBe(404);
    });

    it('should return custom fields array', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({
        customFields: [{ id: 'cf_1', name: 'Priority Score', type: 'number' }],
      });
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/custom-fields'), makeParams('p-1'));
      const data = await res.json();
      expect(data).toHaveLength(1);
    });

    it('should return empty array when customFields is null', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ customFields: null });
      const res = await GET(new NextRequest('http://localhost/api/projects/p-1/custom-fields'), makeParams('p-1'));
      const data = await res.json();
      expect(data).toEqual([]);
    });
  });

  describe('POST', () => {
    const makeReq = (body: object) => new NextRequest('http://localhost/api/projects/p-1/custom-fields', {
      method: 'POST', body: JSON.stringify(body),
    });

    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ name: 'Field', type: 'text' }), makeParams('p-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 if project not found or not admin', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ name: 'Field', type: 'text' }), makeParams('p-1'));
      expect(res.status).toBe(404);
    });

    it('should return 400 for duplicate field name', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({
        customFields: [{ id: 'cf_1', name: 'Existing', type: 'text' }],
      });
      const res = await POST(makeReq({ name: 'existing', type: 'text' }), makeParams('p-1'));
      expect(res.status).toBe(400);
    });

    it('should create custom field successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ customFields: [] });
      (prisma.project.update as jest.Mock).mockResolvedValue({});
      const res = await POST(makeReq({ name: 'Score', type: 'number' }), makeParams('p-1'));
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.name).toBe('Score');
      expect(data.type).toBe('number');
    });
  });

  describe('PATCH', () => {
    const makeReq = (body: object) => new NextRequest('http://localhost/api/projects/p-1/custom-fields', {
      method: 'PATCH', body: JSON.stringify(body),
    });

    it('should return 404 if field not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ customFields: [] });
      const res = await PATCH(makeReq({ id: 'cf_missing', name: 'Updated' }), makeParams('p-1'));
      expect(res.status).toBe(404);
    });

    it('should update field successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({
        customFields: [{ id: 'cf_1', name: 'Old', type: 'text', order: 0 }],
      });
      (prisma.project.update as jest.Mock).mockResolvedValue({});
      const res = await PATCH(makeReq({ id: 'cf_1', name: 'New Name' }), makeParams('p-1'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe('New Name');
    });
  });

  describe('DELETE', () => {
    it('should return 400 if fieldId missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      const res = await DELETE(new NextRequest('http://localhost/api/projects/p-1/custom-fields'), makeParams('p-1'));
      expect(res.status).toBe(400);
    });

    it('should return 404 if field not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({ customFields: [] });
      const res = await DELETE(new NextRequest('http://localhost/api/projects/p-1/custom-fields?fieldId=cf_missing'), makeParams('p-1'));
      expect(res.status).toBe(404);
    });

    it('should delete field and clean up task values', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.project.findFirst as jest.Mock).mockResolvedValue({
        customFields: [{ id: 'cf_1', name: 'Field', type: 'text', order: 0 }],
      });
      (prisma.project.update as jest.Mock).mockResolvedValue({});
      (prisma.task.findMany as jest.Mock).mockResolvedValue([
        { id: 't-1', customFieldValues: { cf_1: 'value' } },
      ]);
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      const res = await DELETE(new NextRequest('http://localhost/api/projects/p-1/custom-fields?fieldId=cf_1'), makeParams('p-1'));
      expect(res.status).toBe(200);
      expect(prisma.task.update).toHaveBeenCalled();
    });
  });
});
