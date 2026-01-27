import { describe, it, expect } from '@jest/globals';
import { TaskStatus, TaskPriority, TaskType } from '../types';
import { performTaskOperation } from '../lib/utils';


describe('Task Operations', () => {
  it('should perform an operation and return the result', () => {
    const task = {
      id: 'task-1',
      title: 'Sample Task',
      description: 'This is a sample task',
      status: TaskStatus.BACKLOG,
      priority: TaskPriority.MEDIUM,
      taskType: TaskType.TASK
    };

    const result = performTaskOperation(task);
    expect(result).toBe(true);
  });

  it('should handle invalid task gracefully', () => {
    const result = performTaskOperation(null);
    expect(result).toBe(false);
  });
});

