import { Worker, Job } from "bullmq";
import { getRedisConnection } from "@/lib/redis";
import { executeTask, handleReviewComments, handlePRApproval } from "@/services/execution";
import type { ExecuteTaskJob, HandleReviewJob, HandleApprovalJob } from "@/types";

// Cast to any to avoid type conflicts between ioredis versions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connection = getRedisConnection() as any;

// Task execution worker
const taskWorker = new Worker<ExecuteTaskJob>(
  "task-execution",
  async (job: Job<ExecuteTaskJob>) => {
    console.log(`Processing task execution job ${job.id}: taskId=${job.data.taskId}`);

    try {
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

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down workers...");
  await Promise.all([
    taskWorker.close(),
    reviewWorker.close(),
    approvalWorker.close(),
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
