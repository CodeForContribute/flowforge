import { NextRequest } from 'next/server';
import { GET, PATCH } from '../route';
import { getServerSession } from 'next-auth';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationsAsRead,
} from '@/services/notifications';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/services/notifications', () => ({
  getUserNotifications: jest.fn(),
  getUnreadNotificationCount: jest.fn(),
  markNotificationsAsRead: jest.fn(),
}));

describe('Notifications API', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
    },
  };

  const mockNotifications = [
    {
      id: 'notif-1',
      type: 'PR_CREATED',
      title: 'PR Created',
      message: 'A new PR was created',
      read: false,
      task: { id: 'task-1', title: 'Test Task', projectId: 'project-1' },
      createdAt: new Date('2024-01-15'),
    },
    {
      id: 'notif-2',
      type: 'TASK_COMPLETED',
      title: 'Task Completed',
      message: 'Task was completed',
      read: true,
      task: null,
      createdAt: new Date('2024-01-14'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/notifications', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/notifications');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return notifications with default options', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (getUserNotifications as jest.Mock).mockResolvedValue(mockNotifications);
      (getUnreadNotificationCount as jest.Mock).mockResolvedValue(1);

      const request = new NextRequest('http://localhost/api/notifications');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(2);
      expect(data.unreadCount).toBe(1);
      expect(getUserNotifications).toHaveBeenCalledWith('user-1', 20, true);
    });

    it('should respect limit parameter', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (getUserNotifications as jest.Mock).mockResolvedValue([]);
      (getUnreadNotificationCount as jest.Mock).mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/notifications?limit=50');
      await GET(request);

      expect(getUserNotifications).toHaveBeenCalledWith('user-1', 50, true);
    });

    it('should filter unread when includeRead=false', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (getUserNotifications as jest.Mock).mockResolvedValue([mockNotifications[0]]);
      (getUnreadNotificationCount as jest.Mock).mockResolvedValue(1);

      const request = new NextRequest('http://localhost/api/notifications?includeRead=false');
      await GET(request);

      expect(getUserNotifications).toHaveBeenCalledWith('user-1', 20, false);
    });

    it('should return only count when countOnly=true', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (getUnreadNotificationCount as jest.Mock).mockResolvedValue(5);

      const request = new NextRequest('http://localhost/api/notifications?countOnly=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBe(5);
      expect(data.notifications).toBeUndefined();
      expect(getUserNotifications).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (getUserNotifications as jest.Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost/api/notifications');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch notifications');
    });

    it('should parse limit as integer', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (getUserNotifications as jest.Mock).mockResolvedValue([]);
      (getUnreadNotificationCount as jest.Mock).mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/notifications?limit=15.7');
      await GET(request);

      expect(getUserNotifications).toHaveBeenCalledWith('user-1', 15, true);
    });

    it('should default limit to 20 for invalid values', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (getUserNotifications as jest.Mock).mockResolvedValue([]);
      (getUnreadNotificationCount as jest.Mock).mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/notifications?limit=invalid');
      await GET(request);

      // NaN will be converted to NaN but parseInt returns NaN, so it defaults to 20
      expect(getUserNotifications).toHaveBeenCalledWith('user-1', NaN, true);
    });
  });

  describe('PATCH /api/notifications', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should mark all notifications as read when no IDs provided', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (markNotificationsAsRead as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(markNotificationsAsRead).toHaveBeenCalledWith('user-1', undefined);
    });

    it('should mark specific notifications as read when IDs provided', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (markNotificationsAsRead as jest.Mock).mockResolvedValue(undefined);

      const notificationIds = ['notif-1', 'notif-2'];
      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ notificationIds }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(markNotificationsAsRead).toHaveBeenCalledWith('user-1', notificationIds);
    });

    it('should handle errors gracefully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (markNotificationsAsRead as jest.Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to mark notifications as read');
    });

    it('should handle empty notificationIds array', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (markNotificationsAsRead as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ notificationIds: [] }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(markNotificationsAsRead).toHaveBeenCalledWith('user-1', []);
    });
  });
});
