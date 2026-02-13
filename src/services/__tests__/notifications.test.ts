import { prisma } from '@/lib/prisma';
import {
  createNotification,
  notifyPRCreated,
  notifyPRMerged,
  notifyReviewRequested,
  notifyTaskCompleted,
  notifyTaskFailed,
  notifyMention,
  notifyWatchersTaskUpdated,
  notifyWatchersCommentAdded,
  getTaskWatchers,
  parseMentions,
  getUnreadNotificationCount,
  getUserNotifications,
  markNotificationsAsRead,
} from '../notifications';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    userPreferences: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    task: {
      findUnique: jest.fn(),
    },
    projectMember: {
      findMany: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'email-id' }),
    },
  })),
}));

describe('notifications service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: user has all notifications enabled
    (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ email: 'user@example.com' });
    (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'notification-1' });
  });

  describe('createNotification', () => {
    it('should create a notification when user preferences allow', async () => {
      await createNotification({
        userId: 'user-1',
        type: 'PR_CREATED',
        title: 'Test Title',
        message: 'Test Message',
        taskId: 'task-1',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'PR_CREATED',
          title: 'Test Title',
          message: 'Test Message',
          taskId: 'task-1',
          projectId: undefined,
        },
      });
    });

    it('should skip notification when user has disabled that notification type', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        notifyPrCreated: false,
      });

      await createNotification({
        userId: 'user-1',
        type: 'PR_CREATED',
        title: 'Test Title',
        message: 'Test Message',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should check PR_MERGED preference correctly', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        notifyPrMerged: false,
      });

      await createNotification({
        userId: 'user-1',
        type: 'PR_MERGED',
        title: 'Test',
        message: 'Test',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should check REVIEW_REQUESTED preference correctly', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        notifyReviewRequested: false,
      });

      await createNotification({
        userId: 'user-1',
        type: 'REVIEW_REQUESTED',
        title: 'Test',
        message: 'Test',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should check TASK_COMPLETED preference correctly', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        notifyTaskCompleted: false,
      });

      await createNotification({
        userId: 'user-1',
        type: 'TASK_COMPLETED',
        title: 'Test',
        message: 'Test',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should check TASK_FAILED preference correctly', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({
        notifyTaskFailed: false,
      });

      await createNotification({
        userId: 'user-1',
        type: 'TASK_FAILED',
        title: 'Test',
        message: 'Test',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should default to true for unknown notification types', async () => {
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue({});

      await createNotification({
        userId: 'user-1',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'MENTIONED' as any,
        title: 'Test',
        message: 'Test',
      });

      expect(prisma.notification.create).toHaveBeenCalled();
    });
  });

  describe('notifyPRCreated', () => {
    it('should create a PR_CREATED notification', async () => {
      await notifyPRCreated('user-1', {
        taskId: 'task-1',
        taskTitle: 'Add feature',
        projectName: 'My Project',
        prNumber: 123,
        prUrl: 'https://github.com/owner/repo/pull/123',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'PR_CREATED',
            title: 'Pull Request Created',
            taskId: 'task-1',
          }),
        })
      );
    });
  });

  describe('notifyPRMerged', () => {
    it('should create a PR_MERGED notification with branch name', async () => {
      await notifyPRMerged('user-1', {
        taskId: 'task-1',
        taskTitle: 'Fix bug',
        projectName: 'My Project',
        branchName: 'develop',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'PR_MERGED',
            title: 'Pull Request Merged',
            message: expect.stringContaining('develop'),
          }),
        })
      );
    });

    it('should default to main branch if branchName not provided', async () => {
      await notifyPRMerged('user-1', {
        taskId: 'task-1',
        taskTitle: 'Fix bug',
        projectName: 'My Project',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            message: expect.stringContaining('main'),
          }),
        })
      );
    });
  });

  describe('notifyReviewRequested', () => {
    it('should create notification with reviewer name', async () => {
      await notifyReviewRequested(
        'user-1',
        {
          taskId: 'task-1',
          taskTitle: 'Add tests',
          projectName: 'My Project',
        },
        'John Doe'
      );

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'REVIEW_REQUESTED',
            title: 'Changes Requested',
            message: expect.stringContaining('John Doe'),
          }),
        })
      );
    });

    it('should use default text when reviewer name not provided', async () => {
      await notifyReviewRequested('user-1', {
        taskId: 'task-1',
        taskTitle: 'Add tests',
        projectName: 'My Project',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            message: expect.stringContaining('A reviewer'),
          }),
        })
      );
    });
  });

  describe('notifyTaskCompleted', () => {
    it('should create a TASK_COMPLETED notification', async () => {
      await notifyTaskCompleted('user-1', {
        taskId: 'task-1',
        taskTitle: 'Complete task',
        projectName: 'My Project',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'TASK_COMPLETED',
            title: 'Task Execution Completed',
          }),
        })
      );
    });
  });

  describe('notifyTaskFailed', () => {
    it('should create a TASK_FAILED notification with error message', async () => {
      await notifyTaskFailed(
        'user-1',
        {
          taskId: 'task-1',
          taskTitle: 'Broken task',
          projectName: 'My Project',
        },
        'Connection timeout'
      );

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'TASK_FAILED',
            title: 'Task Execution Failed',
            message: expect.stringContaining('Connection timeout'),
          }),
        })
      );
    });

    it('should create notification without error message', async () => {
      await notifyTaskFailed('user-1', {
        taskId: 'task-1',
        taskTitle: 'Broken task',
        projectName: 'My Project',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'TASK_FAILED',
            message: expect.not.stringContaining('Error:'),
          }),
        })
      );
    });
  });

  describe('notifyMention', () => {
    it('should create a MENTIONED notification', async () => {
      await notifyMention(
        'user-2',
        'John Doe',
        'task-1',
        'Add feature',
        'My Project',
        'Hey @user2, can you review this?'
      );

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-2',
            type: 'MENTIONED',
            title: 'You were mentioned',
            message: expect.stringContaining('John Doe'),
          }),
        })
      );
    });

    it('should truncate long comment previews', async () => {
      const longComment = 'A'.repeat(200);

      await notifyMention(
        'user-2',
        'John Doe',
        'task-1',
        'Task',
        'Project',
        longComment
      );

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            message: expect.stringContaining('...'),
          }),
        })
      );
    });
  });

  describe('notifyWatchersTaskUpdated', () => {
    it('should notify all watchers except the updater', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue({
        watchers: [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }],
      });

      await notifyWatchersTaskUpdated(
        'task-1',
        'Task Title',
        'Project Name',
        'John Doe',
        'updated the status',
        'user-1' // exclude this user
      );

      // Should create notifications for user-2 and user-3, not user-1
      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    });

    it('should do nothing if task not found', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);

      await notifyWatchersTaskUpdated(
        'nonexistent',
        'Task',
        'Project',
        'John',
        'updated'
      );

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('notifyWatchersCommentAdded', () => {
    it('should notify watchers except excluded users', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue({
        watchers: [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }],
      });

      await notifyWatchersCommentAdded(
        'task-1',
        'Task Title',
        'Project Name',
        'Jane Doe',
        'Great work!',
        ['user-1', 'user-2'] // exclude these users
      );

      // Should only notify user-3
      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    });

    it('should truncate long comment previews', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue({
        watchers: [{ id: 'user-1' }],
      });

      const longComment = 'B'.repeat(150);

      await notifyWatchersCommentAdded(
        'task-1',
        'Task',
        'Project',
        'John',
        longComment
      );

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            message: expect.stringContaining('...'),
          }),
        })
      );
    });
  });

  describe('getTaskWatchers', () => {
    it('should return array of watcher IDs', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue({
        watchers: [{ id: 'user-1' }, { id: 'user-2' }],
      });

      const result = await getTaskWatchers('task-1');

      expect(result).toEqual(['user-1', 'user-2']);
    });

    it('should return empty array if task not found', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getTaskWatchers('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('parseMentions', () => {
    it('should extract usernames from @mentions', async () => {
      (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([
        { user: { id: 'user-1', name: 'john' } },
      ]);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        user: { id: 'owner-1', name: 'owner' },
      });

      const result = await parseMentions('Hey @john, check this out!', 'project-1');

      expect(result).toContainEqual({ userId: 'user-1', username: 'john' });
    });

    it('should handle multiple mentions', async () => {
      (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([
        { user: { id: 'user-1', name: 'john' } },
        { user: { id: 'user-2', name: 'jane' } },
      ]);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        user: { id: 'owner-1', name: 'owner' },
      });

      const result = await parseMentions('@john and @jane please review', 'project-1');

      expect(result).toHaveLength(2);
    });

    it('should deduplicate mentions', async () => {
      (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([
        { user: { id: 'user-1', name: 'john' } },
      ]);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        user: { id: 'owner-1', name: 'owner' },
      });

      const result = await parseMentions('@john @john @john', 'project-1');

      expect(result).toHaveLength(1);
    });

    it('should return empty array if no mentions', async () => {
      const result = await parseMentions('No mentions here', 'project-1');

      expect(result).toEqual([]);
      expect(prisma.projectMember.findMany).not.toHaveBeenCalled();
    });

    it('should include project owner if mentioned', async () => {
      (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        user: { id: 'owner-1', name: 'projectowner' },
      });

      const result = await parseMentions('Hey @projectowner', 'project-1');

      expect(result).toContainEqual({ userId: 'owner-1', username: 'projectowner' });
    });

    it('should handle usernames with underscores and hyphens', async () => {
      (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([
        { user: { id: 'user-1', name: 'john_doe-123' } },
      ]);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        user: { id: 'owner-1', name: 'owner' },
      });

      const result = await parseMentions('@john_doe-123 check this', 'project-1');

      expect(result).toContainEqual({ userId: 'user-1', username: 'john_doe-123' });
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return count of unread notifications', async () => {
      (prisma.notification.count as jest.Mock).mockResolvedValue(5);

      const result = await getUnreadNotificationCount('user-1');

      expect(result).toBe(5);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
      });
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications with default options', async () => {
      const mockNotifications = [
        { id: 'notif-1', title: 'Test', task: { id: 'task-1' } },
      ];
      (prisma.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications);

      const result = await getUserNotifications('user-1');

      expect(result).toEqual(mockNotifications);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          take: 20,
        })
      );
    });

    it('should respect limit parameter', async () => {
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);

      await getUserNotifications('user-1', 50);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it('should filter unread only when includeRead is false', async () => {
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);

      await getUserNotifications('user-1', 20, false);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', read: false },
        })
      );
    });
  });

  describe('markNotificationsAsRead', () => {
    it('should mark all notifications as read when no IDs provided', async () => {
      await markNotificationsAsRead('user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { read: true },
      });
    });

    it('should mark specific notifications as read when IDs provided', async () => {
      await markNotificationsAsRead('user-1', ['notif-1', 'notif-2']);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', id: { in: ['notif-1', 'notif-2'] } },
        data: { read: true },
      });
    });
  });
});
