import { prisma } from '@/lib/prisma';
import {
  executeTask,
  handleReviewComments,
  handlePRApproval,
  handlePRComment,
} from '../execution';
import * as githubService from '../github';
import * as agentService from '../agent';
import * as notifications from '../notifications';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    execution: {
      create: jest.fn(),
      update: jest.fn(),
    },
    comment: {
      create: jest.fn(),
    },
    generatedCode: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../github', () => ({
  branchExists: jest.fn(),
  createBranch: jest.fn(),
  createOrUpdateFile: jest.fn(),
  deleteFile: jest.fn(),
  createPullRequest: jest.fn(),
  getOpenPullRequestForBranch: jest.fn(),
  requestReviewers: jest.fn(),
  getPullRequestComments: jest.fn(),
  getFileContent: jest.fn(),
  mergePullRequest: jest.fn(),
  addPRComment: jest.fn(),
}));

jest.mock('../agent', () => ({
  generateCode: jest.fn(),
  respondToReview: jest.fn(),
  classifyComment: jest.fn(),
  generateDiscussionReply: jest.fn(),
  generateCodeFromComment: jest.fn(),
}));

jest.mock('../notifications', () => ({
  notifyPRCreated: jest.fn(),
  notifyPRMerged: jest.fn(),
  notifyReviewRequested: jest.fn(),
  notifyTaskCompleted: jest.fn(),
  notifyTaskFailed: jest.fn(),
  notifyCodeReviewReady: jest.fn(),
}));

describe('execution service', () => {
  const mockTask = {
    id: 'task-1',
    title: 'Add feature',
    description: 'Implement a new feature',
    generatedPrompt: 'Generate code for feature',
    branchName: 'flowforge/add-feature-task-1',
    prNumber: 42,
    prUrl: 'https://github.com/owner/repo/pull/42',
    project: {
      id: 'project-1',
      name: 'Test Project',
      githubRepo: 'owner/repo',
      defaultBranch: 'main',
      agentModel: 'gpt-4',
      reviewers: ['reviewer1'],
      userId: 'user-1',
      user: {
        id: 'user-1',
        accessToken: 'github-token',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.execution.create as jest.Mock).mockResolvedValue({ id: 'exec-1' });
    (prisma.execution.update as jest.Mock).mockResolvedValue({});
    (prisma.task.update as jest.Mock).mockResolvedValue({});
    (prisma.comment.create as jest.Mock).mockResolvedValue({});
    (prisma.generatedCode.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.generatedCode.create as jest.Mock).mockResolvedValue({ id: 'gc-1', version: 1 });
  });

  describe('executeTask', () => {
    beforeEach(() => {
      (prisma.task.findFirst as jest.Mock).mockResolvedValue(mockTask);
      (githubService.branchExists as jest.Mock).mockResolvedValue(false);
      (githubService.createBranch as jest.Mock).mockResolvedValue(undefined);
      (agentService.generateCode as jest.Mock).mockResolvedValue({
        files: [{ path: 'src/index.ts', content: 'console.log("hello");', action: 'create' }],
        summary: 'Created index file',
      });
      (githubService.createOrUpdateFile as jest.Mock).mockResolvedValue(undefined);
      (githubService.getOpenPullRequestForBranch as jest.Mock).mockResolvedValue(null);
      (githubService.createPullRequest as jest.Mock).mockResolvedValue({
        number: 42,
        html_url: 'https://github.com/owner/repo/pull/42',
      });
      (githubService.requestReviewers as jest.Mock).mockResolvedValue(undefined);
    });

    it('should throw error if task not found', async () => {
      (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        executeTask({ taskId: 'nonexistent', userId: 'user-1' })
      ).rejects.toThrow('Task not found');
    });

    it('should throw error if task has no generated prompt', async () => {
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({
        ...mockTask,
        generatedPrompt: null,
      });

      await expect(
        executeTask({ taskId: 'task-1', userId: 'user-1' })
      ).rejects.toThrow('Task has no generated prompt');
    });

    it('should throw error for invalid GitHub repository', async () => {
      (prisma.task.findFirst as jest.Mock).mockResolvedValue({
        ...mockTask,
        project: { ...mockTask.project, githubRepo: 'invalid' },
      });

      await expect(
        executeTask({ taskId: 'task-1', userId: 'user-1' })
      ).rejects.toThrow('Invalid GitHub repository');
    });

    it('should execute task successfully - generate code and save for review', async () => {
      await executeTask({ taskId: 'task-1', userId: 'user-1' });

      expect(githubService.branchExists).toHaveBeenCalled();
      expect(githubService.createBranch).toHaveBeenCalledWith(
        'github-token',
        'owner',
        'repo',
        expect.stringContaining('flowforge/'),
        'main'
      );
      expect(agentService.generateCode).toHaveBeenCalled();
      // New flow: saves to DB for review instead of pushing to GitHub
      expect(prisma.generatedCode.create).toHaveBeenCalled();
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'AWAITING_CODE_REVIEW' },
      });
      expect(notifications.notifyCodeReviewReady).toHaveBeenCalled();
    });

    it('should reuse existing branch if it exists', async () => {
      (githubService.branchExists as jest.Mock).mockResolvedValue(true);

      await executeTask({ taskId: 'task-1', userId: 'user-1' });

      expect(githubService.createBranch).not.toHaveBeenCalled();
    });

    it('should save generated code with correct version number', async () => {
      (prisma.generatedCode.findFirst as jest.Mock).mockResolvedValue({ version: 2 });

      await executeTask({ taskId: 'task-1', userId: 'user-1' });

      expect(prisma.generatedCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskId: 'task-1',
            version: 3,
            status: 'PENDING_REVIEW',
          }),
        })
      );
    });

    it('should handle file deletions in generated output', async () => {
      (agentService.generateCode as jest.Mock).mockResolvedValue({
        files: [{ path: 'obsolete.ts', action: 'delete' }],
        summary: 'Deleted obsolete file',
      });

      await executeTask({ taskId: 'task-1', userId: 'user-1' });

      // Files saved to DB for review, not pushed directly
      expect(prisma.generatedCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            files: [{ path: 'obsolete.ts', action: 'delete' }],
          }),
        })
      );
    });

    it('should increment version from 0 when no prior versions exist', async () => {
      (prisma.generatedCode.findFirst as jest.Mock).mockResolvedValue(null);

      await executeTask({ taskId: 'task-1', userId: 'user-1' });

      expect(prisma.generatedCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 1 }),
        })
      );
    });

    it('should notify on failure and reset task status', async () => {
      (agentService.generateCode as jest.Mock).mockRejectedValue(new Error('AI error'));

      await expect(
        executeTask({ taskId: 'task-1', userId: 'user-1' })
      ).rejects.toThrow('AI error');

      expect(notifications.notifyTaskFailed).toHaveBeenCalled();
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'IN_PROGRESS' },
      });
    });
  });

  describe('handleReviewComments', () => {
    beforeEach(() => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (githubService.getPullRequestComments as jest.Mock).mockResolvedValue([
        { id: 1, body: 'Fix this', path: 'src/index.ts', line: 10, user: { login: 'reviewer' } },
      ]);
      (githubService.getFileContent as jest.Mock).mockResolvedValue('const x = 1;');
      (agentService.respondToReview as jest.Mock).mockResolvedValue({
        files: [{ path: 'src/index.ts', content: 'const x = 2;', action: 'modify' }],
        explanation: 'Fixed the issue',
      });
      (githubService.createOrUpdateFile as jest.Mock).mockResolvedValue(undefined);
      (githubService.addPRComment as jest.Mock).mockResolvedValue(undefined);
    });

    it('should throw error if task not found', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        handleReviewComments({ taskId: 'nonexistent', prNumber: 42, reviewId: 1 })
      ).rejects.toThrow('Task not found');
    });

    it('should throw error for invalid task state', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        branchName: null,
      });

      await expect(
        handleReviewComments({ taskId: 'task-1', prNumber: 42, reviewId: 1 })
      ).rejects.toThrow('Invalid task state');
    });

    it('should handle review comments and commit changes', async () => {
      await handleReviewComments({ taskId: 'task-1', prNumber: 42, reviewId: 1 });

      expect(notifications.notifyReviewRequested).toHaveBeenCalled();
      expect(githubService.getPullRequestComments).toHaveBeenCalled();
      expect(githubService.getFileContent).toHaveBeenCalled();
      expect(agentService.respondToReview).toHaveBeenCalled();
      expect(githubService.createOrUpdateFile).toHaveBeenCalled();
      expect(githubService.addPRComment).toHaveBeenCalled();
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'IN_REVIEW' },
      });
    });

    it('should skip if no review comments', async () => {
      (githubService.getPullRequestComments as jest.Mock).mockResolvedValue([]);

      await handleReviewComments({ taskId: 'task-1', prNumber: 42, reviewId: 1 });

      expect(agentService.respondToReview).not.toHaveBeenCalled();
    });

    it('should handle file deletions in review response', async () => {
      (agentService.respondToReview as jest.Mock).mockResolvedValue({
        files: [{ path: 'src/old.ts', action: 'delete' }],
        explanation: 'Removed old file',
      });

      await handleReviewComments({ taskId: 'task-1', prNumber: 42, reviewId: 1 });

      expect(githubService.deleteFile).toHaveBeenCalled();
    });
  });

  describe('handlePRApproval', () => {
    beforeEach(() => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (githubService.mergePullRequest as jest.Mock).mockResolvedValue(undefined);
    });

    it('should throw error if task not found', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        handlePRApproval({ taskId: 'nonexistent', prNumber: 42 })
      ).rejects.toThrow('Task not found');
    });

    it('should throw error for invalid GitHub repository', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        project: { ...mockTask.project, githubRepo: 'invalid' },
      });

      await expect(
        handlePRApproval({ taskId: 'task-1', prNumber: 42 })
      ).rejects.toThrow('Invalid GitHub repository');
    });

    it('should merge PR and update task status', async () => {
      await handlePRApproval({ taskId: 'task-1', prNumber: 42 });

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'APPROVED' },
      });
      expect(githubService.mergePullRequest).toHaveBeenCalledWith(
        'github-token',
        'owner',
        'repo',
        42,
        'Add feature'
      );
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'MERGED' },
      });
      expect(notifications.notifyPRMerged).toHaveBeenCalled();
    });

    it('should handle merge failure', async () => {
      (githubService.mergePullRequest as jest.Mock).mockRejectedValue(new Error('Merge conflict'));

      await expect(
        handlePRApproval({ taskId: 'task-1', prNumber: 42 })
      ).rejects.toThrow('Merge conflict');

      expect(prisma.execution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        })
      );
    });
  });

  describe('handlePRComment', () => {
    beforeEach(() => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (agentService.classifyComment as jest.Mock).mockResolvedValue({
        intent: 'discussion',
        confidence: 0.9,
        reasoning: 'User is asking a question',
      });
      (agentService.generateDiscussionReply as jest.Mock).mockResolvedValue({
        reply: 'Here is my response',
      });
      (githubService.addPRComment as jest.Mock).mockResolvedValue(undefined);
    });

    it('should throw error if task not found', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        handlePRComment({
          taskId: 'nonexistent',
          prNumber: 42,
          commentId: 1,
          commentBody: 'test',
          commentAuthor: 'user',
        })
      ).rejects.toThrow('Task not found');
    });

    it('should throw error for invalid task state', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        branchName: null,
      });

      await expect(
        handlePRComment({
          taskId: 'task-1',
          prNumber: 42,
          commentId: 1,
          commentBody: 'test',
          commentAuthor: 'user',
        })
      ).rejects.toThrow('Invalid task state');
    });

    it('should classify comment and respond to discussion', async () => {
      await handlePRComment({
        taskId: 'task-1',
        prNumber: 42,
        commentId: 1,
        commentBody: 'What does this function do?',
        commentAuthor: 'reviewer1',
      });

      expect(agentService.classifyComment).toHaveBeenCalled();
      expect(agentService.generateDiscussionReply).toHaveBeenCalled();
      expect(githubService.addPRComment).toHaveBeenCalled();
    });

    it('should handle code change requests by saving for review', async () => {
      (agentService.classifyComment as jest.Mock).mockResolvedValue({
        intent: 'code_change',
        confidence: 0.95,
        reasoning: 'User requesting code changes',
      });
      (githubService.getPullRequestComments as jest.Mock).mockResolvedValue([
        { path: 'src/index.ts' },
      ]);
      (githubService.getFileContent as jest.Mock).mockResolvedValue('const x = 1;');
      (agentService.generateCodeFromComment as jest.Mock).mockResolvedValue({
        files: [{ path: 'src/index.ts', content: 'const x = 2;', action: 'modify' }],
        explanation: 'Updated code',
      });

      await handlePRComment({
        taskId: 'task-1',
        prNumber: 42,
        commentId: 1,
        commentBody: 'Please change x to 2',
        commentAuthor: 'reviewer1',
      });

      expect(agentService.generateCodeFromComment).toHaveBeenCalled();
      // New flow: saves to DB for review instead of pushing to GitHub
      expect(prisma.generatedCode.create).toHaveBeenCalled();
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'AWAITING_CODE_REVIEW' },
      });
    });

    it('should handle code deletion requests by saving for review', async () => {
      (agentService.classifyComment as jest.Mock).mockResolvedValue({
        intent: 'code_change',
        confidence: 0.9,
        reasoning: 'User wants to delete file',
      });
      (githubService.getPullRequestComments as jest.Mock).mockResolvedValue([]);
      (agentService.generateCodeFromComment as jest.Mock).mockResolvedValue({
        files: [{ path: 'src/old.ts', action: 'delete' }],
        explanation: 'Deleted file',
      });

      await handlePRComment({
        taskId: 'task-1',
        prNumber: 42,
        commentId: 1,
        commentBody: 'Remove old.ts',
        commentAuthor: 'reviewer1',
      });

      // New flow: saves to DB for review instead of deleting directly
      expect(prisma.generatedCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            files: [{ path: 'src/old.ts', action: 'delete' }],
          }),
        })
      );
    });

    it('should handle classification failure', async () => {
      (agentService.classifyComment as jest.Mock).mockRejectedValue(new Error('AI error'));

      await expect(
        handlePRComment({
          taskId: 'task-1',
          prNumber: 42,
          commentId: 1,
          commentBody: 'test',
          commentAuthor: 'user',
        })
      ).rejects.toThrow('AI error');
    });
  });
});
