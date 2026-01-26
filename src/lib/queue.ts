import { Queue, QueueEvents } from "bullmq";
import { getRedisConnection } from "./redis";
import type { ExecuteTaskJob, HandleReviewJob, HandleApprovalJob } from "@/types";

// Cast to any to avoid type conflicts between ioredis versions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connection = getRedisConnection() as any;

// Task execution queue
export const taskQueue = new Queue<ExecuteTaskJob>("task-execution", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 500,
    },
  },
});

// Review handling queue
export const reviewQueue = new Queue<HandleReviewJob>("review-handling", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 500,
    },
  },
});

// Approval handling queue
export const approvalQueue = new Queue<HandleApprovalJob>("approval-handling", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 500,
    },
  },
});

// Queue events for monitoring
export const taskQueueEvents = new QueueEvents("task-execution", { connection });
export const reviewQueueEvents = new QueueEvents("review-handling", { connection });
export const approvalQueueEvents = new QueueEvents("approval-handling", { connection });

// Helper functions to add jobs
export async function addTaskExecutionJob(data: ExecuteTaskJob): Promise<string> {
  const job = await taskQueue.add("execute-task", data, {
    jobId: `task-${data.taskId}-${Date.now()}`,
  });
  return job.id || "";
}

export async function addReviewHandlingJob(data: HandleReviewJob): Promise<string> {
  const job = await reviewQueue.add("handle-review", data, {
    jobId: `review-${data.taskId}-${data.reviewId}-${Date.now()}`,
  });
  return job.id || "";
}

export async function addApprovalHandlingJob(data: HandleApprovalJob): Promise<string> {
  const job = await approvalQueue.add("handle-approval", data, {
    jobId: `approval-${data.taskId}-${data.prNumber}-${Date.now()}`,
  });
  return job.id || "";
}
