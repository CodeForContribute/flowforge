import { Worker, Job } from "bullmq";
import { getRedisConnection } from "@/lib/redis";
import { executeTask, handleReviewComments, handlePRApproval, handlePRComment, continueExecution, continueCommentResponse } from "@/services/execution";
import { getProjectAIConfig } from "@/lib/ai-config";
import { prisma } from "@/lib/prisma";
import type { ExecuteTaskJob, HandleReviewJob, HandleApprovalJob, HandlePRCommentJob, ContinueExecutionJob, ContinueCommentResponseJob } from "@/types";

async function getProjectIdFromTaskId(taskId: string): Promise<string | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  return task?.projectId ?? null;
}

// Cast to any to avoid type conflicts between ioredis versions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connection = getRedisConnection() as any;

// Task execution worker
const taskWorker = new Worker<ExecuteTaskJob>(
  "task-execution",
  async (job: Job<ExecuteTaskJob>) => {
    console.log(`Processing task execution job ${job.id}: taskId=${job.data.taskId}`);

    try {
      // Check if AI is enabled for this project
      const projectId = await getProjectIdFromTaskId(job.data.taskId);
      if (!projectId) {
        console.log(`Task ${job.data.taskId} not found, skipping`);
        return;
      }

      const aiConfig = await getProjectAIConfig(projectId);
      if (!aiConfig.aiEnabled) {
        console.log(`AI disabled for project ${projectId}, skipping task execution`);
        return;
      }

      if (!aiConfig.autoExecuteTasks) {
        console.log(`Auto-execute disabled for project ${projectId}, skipping task execution`);
        return;
      }

      await executeTask(job.data);
      console.log(`Completed task execution job ${job.id}`);
    } catch (error) {
      console.error(`Failed task execution job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

// Review handling worker
const reviewWorker = new Worker<HandleReviewJob>(
  "review-handling",
  async (job: Job<HandleReviewJob>) => {
    console.log(`Processing review handling job ${job.id}: taskId=${job.data.taskId}`);

    try {
      // Check if AI is enabled for this project
      const projectId = await getProjectIdFromTaskId(job.data.taskId);
      if (!projectId) {
        console.log(`Task ${job.data.taskId} not found, skipping`);
        return;
      }

      const aiConfig = await getProjectAIConfig(projectId);
      if (!aiConfig.aiEnabled) {
        console.log(`AI disabled for project ${projectId}, skipping review handling`);
        return;
      }

      if (!aiConfig.autoRespondReviews) {
        console.log(`Auto-respond reviews disabled for project ${projectId}, skipping`);
        return;
      }

      await handleReviewComments(job.data);
      console.log(`Completed review handling job ${job.id}`);
    } catch (error) {
      console.error(`Failed review handling job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

// Approval handling worker
const approvalWorker = new Worker<HandleApprovalJob>(
  "approval-handling",
  async (job: Job<HandleApprovalJob>) => {
    console.log(`Processing approval handling job ${job.id}: taskId=${job.data.taskId}`);

    try {
      // Check if AI is enabled for this project
      const projectId = await getProjectIdFromTaskId(job.data.taskId);
      if (!projectId) {
        console.log(`Task ${job.data.taskId} not found, skipping`);
        return;
      }

      const aiConfig = await getProjectAIConfig(projectId);
      if (!aiConfig.aiEnabled) {
        console.log(`AI disabled for project ${projectId}, skipping approval handling`);
        return;
      }

      await handlePRApproval(job.data);
      console.log(`Completed approval handling job ${job.id}`);
    } catch (error) {
      console.error(`Failed approval handling job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

// PR comment handling worker (intelligent comment analysis)
const prCommentWorker = new Worker<HandlePRCommentJob>(
  "pr-comment-handling",
  async (job: Job<HandlePRCommentJob>) => {
    console.log(`Processing PR comment job ${job.id}: taskId=${job.data.taskId}, comment #${job.data.commentId}`);

    try {
      // Check if AI is enabled for this project
      const projectId = await getProjectIdFromTaskId(job.data.taskId);
      if (!projectId) {
        console.log(`Task ${job.data.taskId} not found, skipping`);
        return;
      }

      const aiConfig = await getProjectAIConfig(projectId);
      if (!aiConfig.aiEnabled) {
        console.log(`AI disabled for project ${projectId}, skipping PR comment handling`);
        return;
      }

      if (!aiConfig.autoRespondComments) {
        console.log(`Auto-respond comments disabled for project ${projectId}, skipping`);
        return;
      }

      await handlePRComment(job.data);
      console.log(`Completed PR comment job ${job.id}`);
    } catch (error) {
      console.error(`Failed PR comment job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

// Continue execution worker (Phase 2 after code review approval)
const continueExecutionWorker = new Worker<ContinueExecutionJob>(
  "continue-execution",
  async (job: Job<ContinueExecutionJob>) => {
    console.log(`Processing continue execution job ${job.id}: taskId=${job.data.taskId}`);

    try {
      // Check if AI is enabled for this project
      const projectId = await getProjectIdFromTaskId(job.data.taskId);
      if (!projectId) {
        console.log(`Task ${job.data.taskId} not found, skipping`);
        return;
      }

      const aiConfig = await getProjectAIConfig(projectId);
      if (!aiConfig.aiEnabled) {
        console.log(`AI disabled for project ${projectId}, skipping continue execution`);
        return;
      }

      await continueExecution(job.data);
      console.log(`Completed continue execution job ${job.id}`);
    } catch (error) {
      console.error(`Failed continue execution job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

// Event handlers
taskWorker.on("completed", (job) => {
  console.log(`Task job ${job.id} completed`);
});

taskWorker.on("failed", (job, err) => {
  console.error(`Task job ${job?.id} failed:`, err);
});

reviewWorker.on("completed", (job) => {
  console.log(`Review job ${job.id} completed`);
});

reviewWorker.on("failed", (job, err) => {
  console.error(`Review job ${job?.id} failed:`, err);
});

approvalWorker.on("completed", (job) => {
  console.log(`Approval job ${job.id} completed`);
});

approvalWorker.on("failed", (job, err) => {
  console.error(`Approval job ${job?.id} failed:`, err);
});

prCommentWorker.on("completed", (job) => {
  console.log(`PR comment job ${job.id} completed`);
});

prCommentWorker.on("failed", (job, err) => {
  console.error(`PR comment job ${job?.id} failed:`, err);
});

continueExecutionWorker.on("completed", (job) => {
  console.log(`Continue execution job ${job.id} completed`);
});

continueExecutionWorker.on("failed", (job, err) => {
  console.error(`Continue execution job ${job?.id} failed:`, err);
});

// Continue comment response worker (Phase 2 for PR comment code changes)
const continueCommentResponseWorker = new Worker<ContinueCommentResponseJob>(
  "continue-comment-response",
  async (job: Job<ContinueCommentResponseJob>) => {
    console.log(`Processing continue comment response job ${job.id}: taskId=${job.data.taskId}`);

    try {
      // Check if AI is enabled for this project
      const projectId = await getProjectIdFromTaskId(job.data.taskId);
      if (!projectId) {
        console.log(`Task ${job.data.taskId} not found, skipping`);
        return;
      }

      const aiConfig = await getProjectAIConfig(projectId);
      if (!aiConfig.aiEnabled) {
        console.log(`AI disabled for project ${projectId}, skipping continue comment response`);
        return;
      }

      await continueCommentResponse(job.data);
      console.log(`Completed continue comment response job ${job.id}`);
    } catch (error) {
      console.error(`Failed continue comment response job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

continueCommentResponseWorker.on("completed", (job) => {
  console.log(`Continue comment response job ${job.id} completed`);
});

continueCommentResponseWorker.on("failed", (job, err) => {
  console.error(`Continue comment response job ${job?.id} failed:`, err);
});

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down workers...");
  await Promise.all([
    taskWorker.close(),
    reviewWorker.close(),
    approvalWorker.close(),
    prCommentWorker.close(),
    continueExecutionWorker.close(),
    continueCommentResponseWorker.close(),
  ]);
  console.log("Workers shut down");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("FlowForge workers started");
console.log("- Task execution worker: listening");
console.log("- Review handling worker: listening");
console.log("- Approval handling worker: listening");
console.log("- PR comment handling worker: listening (intelligent comment analysis)");
console.log("- Continue execution worker: listening (Phase 2 after code review)");
console.log("- Continue comment response worker: listening (Phase 2 for PR comment code changes)");
