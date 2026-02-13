import { describe, it, expect } from '@jest/globals';
import type { TaskStatus, TaskPriority, TaskType } from '../types';

describe('Task Types', () => {
  it('should accept valid task status values', () => {
    const statuses: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'MERGED', 'CLOSED'];
    expect(statuses).toHaveLength(5);
    statuses.forEach((s) => expect(typeof s).toBe('string'));
  });

  it('should accept valid task priority values', () => {
    const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    expect(priorities).toHaveLength(4);
  });

  it('should accept valid task type values', () => {
    const types: TaskType[] = ['EPIC', 'STORY', 'TASK', 'SUBTASK', 'BUG'];
    expect(types).toHaveLength(5);
  });

  it('should allow constructing a task-like object', () => {
    const task = {
      id: 'task-1',
      title: 'Sample Task',
      description: 'This is a sample task',
      status: 'BACKLOG' as TaskStatus,
      priority: 'MEDIUM' as TaskPriority,
      taskType: 'TASK' as TaskType,
    };

    expect(task.status).toBe('BACKLOG');
    expect(task.priority).toBe('MEDIUM');
    expect(task.taskType).toBe('TASK');
  });
});
