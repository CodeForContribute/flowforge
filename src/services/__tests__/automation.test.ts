import { executeAutomations, buildTaskContext } from '../automation';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: { findUnique: jest.fn() },
    task: { update: jest.fn() },
  },
}));

describe('Automation Service', () => {
  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    status: 'TODO' as const,
    priority: 'MEDIUM' as const,
    taskType: 'TASK' as const,
    assigneeId: null,
    labelIds: ['label-1'],
    storyPoints: 3,
    sprintId: null,
    projectId: 'project-1',
  };

  beforeEach(() => jest.clearAllMocks());

  describe('buildTaskContext', () => {
    it('should map a prisma task to TaskContext', () => {
      const prismaTask = {
        id: 'task-1',
        title: 'Test',
        status: 'TODO',
        priority: 'HIGH',
        taskType: 'BUG',
        assigneeId: 'user-1',
        labels: [{ id: 'label-1' }, { id: 'label-2' }],
        storyPoints: 5,
        sprintId: 'sprint-1',
        projectId: 'project-1',
      };
      const ctx = buildTaskContext(prismaTask);
      expect(ctx).toEqual({
        id: 'task-1',
        title: 'Test',
        status: 'TODO',
        priority: 'HIGH',
        taskType: 'BUG',
        assigneeId: 'user-1',
        labelIds: ['label-1', 'label-2'],
        storyPoints: 5,
        sprintId: 'sprint-1',
        projectId: 'project-1',
      });
    });

    it('should handle missing labels', () => {
      const prismaTask = {
        id: 'task-1',
        title: 'Test',
        status: 'TODO',
        priority: 'HIGH',
        taskType: 'TASK',
        assigneeId: null,
        storyPoints: null,
        sprintId: null,
        projectId: 'project-1',
      };
      const ctx = buildTaskContext(prismaTask);
      expect(ctx.labelIds).toEqual([]);
    });
  });

  describe('executeAutomations', () => {
    it('should do nothing if project has no automation rules', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({ automationRules: null });
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('should do nothing if project not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('should skip disabled rules', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Disabled', enabled: false,
            trigger: 'on_create', conditions: [], actions: [{ action: 'set_status', value: 'IN_PROGRESS' }],
          },
        ],
      });
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('should skip rules with non-matching trigger', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'On assign', enabled: true,
            trigger: 'on_assign', conditions: [], actions: [{ action: 'set_status', value: 'IN_PROGRESS' }],
          },
        ],
      });
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('should execute set_status action on matching trigger', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Auto progress', enabled: true,
            trigger: 'on_create', conditions: [], actions: [{ action: 'set_status', value: 'IN_PROGRESS' }],
          },
        ],
      });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'IN_PROGRESS' },
      });
    });

    it('should execute assign_user action', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Auto assign', enabled: true,
            trigger: 'on_create', conditions: [], actions: [{ action: 'assign_user', value: 'user-2' }],
          },
        ],
      });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { assigneeId: 'user-2' },
      });
    });

    it('should execute add_label action', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Auto label', enabled: true,
            trigger: 'on_create', conditions: [], actions: [{ action: 'add_label', value: 'label-5' }],
          },
        ],
      });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { labels: { connect: { id: 'label-5' } } },
      });
    });

    it('should execute remove_label action', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Remove label', enabled: true,
            trigger: 'on_create', conditions: [], actions: [{ action: 'remove_label', value: 'label-1' }],
          },
        ],
      });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { labels: { disconnect: { id: 'label-1' } } },
      });
    });

    it('should execute add_to_sprint action', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Auto sprint', enabled: true,
            trigger: 'on_create', conditions: [], actions: [{ action: 'add_to_sprint', value: 'sprint-1' }],
          },
        ],
      });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { sprintId: 'sprint-1' },
      });
    });

    it('should match on_status_change with triggerValue', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'On done', enabled: true,
            trigger: 'on_status_change', triggerValue: 'MERGED',
            conditions: [], actions: [{ action: 'assign_user', value: 'user-3' }],
          },
        ],
      });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await executeAutomations(mockTask, { trigger: 'on_status_change', newStatus: 'MERGED' });
      expect(prisma.task.update).toHaveBeenCalled();
    });

    it('should NOT match on_status_change when triggerValue does not match', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'On done', enabled: true,
            trigger: 'on_status_change', triggerValue: 'MERGED',
            conditions: [], actions: [{ action: 'set_status', value: 'IN_PROGRESS' }],
          },
        ],
      });
      await executeAutomations(mockTask, { trigger: 'on_status_change', newStatus: 'IN_PROGRESS' });
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('should skip rule when conditions are not met (equals)', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'High only', enabled: true,
            trigger: 'on_create',
            conditions: [{ field: 'priority', operator: 'equals', value: 'HIGH' }],
            actions: [{ action: 'set_status', value: 'IN_PROGRESS' }],
          },
        ],
      });
      // mockTask has priority MEDIUM
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('should match rule when equals condition is met', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Medium only', enabled: true,
            trigger: 'on_create',
            conditions: [{ field: 'priority', operator: 'equals', value: 'MEDIUM' }],
            actions: [{ action: 'set_status', value: 'IN_PROGRESS' }],
          },
        ],
      });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).toHaveBeenCalled();
    });

    it('should support not_equals condition', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Not low', enabled: true,
            trigger: 'on_create',
            conditions: [{ field: 'priority', operator: 'not_equals', value: 'LOW' }],
            actions: [{ action: 'set_status', value: 'IN_PROGRESS' }],
          },
        ],
      });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).toHaveBeenCalled();
    });

    it('should support contains condition on arrays', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Has label', enabled: true,
            trigger: 'on_create',
            conditions: [{ field: 'labelIds', operator: 'contains', value: 'label-1' }],
            actions: [{ action: 'set_status', value: 'IN_PROGRESS' }],
          },
        ],
      });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).toHaveBeenCalled();
    });

    it('should support not_contains condition on arrays', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'No label-99', enabled: true,
            trigger: 'on_create',
            conditions: [{ field: 'labelIds', operator: 'not_contains', value: 'label-99' }],
            actions: [{ action: 'set_status', value: 'IN_PROGRESS' }],
          },
        ],
      });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).toHaveBeenCalled();
    });

    it('should support greater_than condition', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Big story', enabled: true,
            trigger: 'on_create',
            conditions: [{ field: 'storyPoints', operator: 'greater_than', value: 2 }],
            actions: [{ action: 'set_status', value: 'IN_PROGRESS' }],
          },
        ],
      });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).toHaveBeenCalled();
    });

    it('should support less_than condition', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Small story', enabled: true,
            trigger: 'on_create',
            conditions: [{ field: 'storyPoints', operator: 'less_than', value: 5 }],
            actions: [{ action: 'set_status', value: 'IN_PROGRESS' }],
          },
        ],
      });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).toHaveBeenCalled();
    });

    it('should support is_empty condition', async () => {
      const taskNoAssignee = { ...mockTask, assigneeId: null };
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Unassigned', enabled: true,
            trigger: 'on_create',
            conditions: [{ field: 'assigneeId', operator: 'is_empty', value: null }],
            actions: [{ action: 'assign_user', value: 'user-default' }],
          },
        ],
      });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await executeAutomations(taskNoAssignee, { trigger: 'on_create' });
      expect(prisma.task.update).toHaveBeenCalled();
    });

    it('should support is_not_empty condition', async () => {
      const taskWithAssignee = { ...mockTask, assigneeId: 'user-1' };
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Has assignee', enabled: true,
            trigger: 'on_create',
            conditions: [{ field: 'assigneeId', operator: 'is_not_empty', value: null }],
            actions: [{ action: 'set_status', value: 'IN_PROGRESS' }],
          },
        ],
      });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await executeAutomations(taskWithAssignee, { trigger: 'on_create' });
      expect(prisma.task.update).toHaveBeenCalled();
    });

    it('should execute multiple actions in sequence', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Multi-action', enabled: true,
            trigger: 'on_create', conditions: [],
            actions: [
              { action: 'set_status', value: 'IN_PROGRESS' },
              { action: 'assign_user', value: 'user-2' },
            ],
          },
        ],
      });
      (prisma.task.update as jest.Mock).mockResolvedValue({});
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).toHaveBeenCalledTimes(2);
    });

    it('should require ALL conditions to match (AND logic)', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Multi-condition', enabled: true,
            trigger: 'on_create',
            conditions: [
              { field: 'priority', operator: 'equals', value: 'MEDIUM' },
              { field: 'status', operator: 'equals', value: 'IN_PROGRESS' }, // task is TODO, not IN_PROGRESS
            ],
            actions: [{ action: 'set_status', value: 'DONE' }],
          },
        ],
      });
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('should not throw on errors - silently catches', async () => {
      (prisma.project.findUnique as jest.Mock).mockRejectedValue(new Error('DB fail'));
      // Should not throw
      await expect(executeAutomations(mockTask, { trigger: 'on_create' })).resolves.toBeUndefined();
    });

    it('should continue executing actions even if one fails', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        automationRules: [
          {
            id: 'rule-1', name: 'Fail action', enabled: true,
            trigger: 'on_create', conditions: [],
            actions: [
              { action: 'set_status', value: 'IN_PROGRESS' },
              { action: 'assign_user', value: 'user-2' },
            ],
          },
        ],
      });
      (prisma.task.update as jest.Mock)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({});
      await executeAutomations(mockTask, { trigger: 'on_create' });
      expect(prisma.task.update).toHaveBeenCalledTimes(2);
    });
  });
});
