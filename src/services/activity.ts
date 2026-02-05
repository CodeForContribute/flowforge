import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type ActivityType =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "STATUS_CHANGED"
  | "ASSIGNEE_CHANGED"
  | "SPRINT_CHANGED"
  | "COMMENT_ADDED"
  | "PR_CREATED"
  | "PR_MERGED"
  | "LABEL_ADDED"
  | "LABEL_REMOVED"
  | "VOTE_ADDED"
  | "VOTE_REMOVED";

interface CreateActivityParams {
  type: ActivityType;
  description: string;
  projectId: string;
  taskId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export async function createActivity({
  type,
  description,
  projectId,
  taskId,
  userId,
  metadata,
}: CreateActivityParams) {
  try {
    return await prisma.activity.create({
      data: {
        type,
        description,
        projectId,
        taskId,
        userId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue : undefined,
      },
    });
  } catch (error) {
    console.error("Error creating activity:", error);
    // Don't throw - activity logging should not break the main operation
    return null;
  }
}

// Helper functions for common activity types

export async function logTaskCreated(
  projectId: string,
  taskId: string,
  taskTitle: string,
  userId: string
) {
  return createActivity({
    type: "TASK_CREATED",
    description: `created task "${taskTitle}"`,
    projectId,
    taskId,
    userId,
  });
}

export async function logTaskUpdated(
  projectId: string,
  taskId: string,
  taskTitle: string,
  userId: string,
  changes: string[]
) {
  if (changes.length === 0) return null;

  return createActivity({
    type: "TASK_UPDATED",
    description: `updated ${changes.join(", ")} on "${taskTitle}"`,
    projectId,
    taskId,
    userId,
    metadata: { changes },
  });
}

export async function logTaskDeleted(
  projectId: string,
  taskTitle: string,
  userId: string
) {
  return createActivity({
    type: "TASK_DELETED",
    description: `deleted task "${taskTitle}"`,
    projectId,
    userId,
  });
}

export async function logStatusChanged(
  projectId: string,
  taskId: string,
  taskTitle: string,
  userId: string,
  fromStatus: string,
  toStatus: string
) {
  return createActivity({
    type: "STATUS_CHANGED",
    description: `changed status from ${fromStatus} to ${toStatus}`,
    projectId,
    taskId,
    userId,
    metadata: { fromStatus, toStatus },
  });
}

export async function logAssigneeChanged(
  projectId: string,
  taskId: string,
  taskTitle: string,
  userId: string,
  assigneeName: string | null
) {
  const description = assigneeName
    ? `assigned "${taskTitle}" to ${assigneeName}`
    : `unassigned "${taskTitle}"`;

  return createActivity({
    type: "ASSIGNEE_CHANGED",
    description,
    projectId,
    taskId,
    userId,
    metadata: { assigneeName },
  });
}

export async function logSprintChanged(
  projectId: string,
  taskId: string,
  taskTitle: string,
  userId: string,
  sprintName: string | null
) {
  const description = sprintName
    ? `moved "${taskTitle}" to sprint "${sprintName}"`
    : `removed "${taskTitle}" from sprint`;

  return createActivity({
    type: "SPRINT_CHANGED",
    description,
    projectId,
    taskId,
    userId,
    metadata: { sprintName },
  });
}

export async function logCommentAdded(
  projectId: string,
  taskId: string,
  taskTitle: string,
  userId: string
) {
  return createActivity({
    type: "COMMENT_ADDED",
    description: `commented on "${taskTitle}"`,
    projectId,
    taskId,
    userId,
  });
}

export async function logPrCreated(
  projectId: string,
  taskId: string,
  taskTitle: string,
  prNumber: number,
  userId?: string
) {
  return createActivity({
    type: "PR_CREATED",
    description: `opened PR #${prNumber} for "${taskTitle}"`,
    projectId,
    taskId,
    userId,
    metadata: { prNumber },
  });
}

export async function logPrMerged(
  projectId: string,
  taskId: string,
  taskTitle: string,
  prNumber: number,
  userId?: string
) {
  return createActivity({
    type: "PR_MERGED",
    description: `merged PR #${prNumber} for "${taskTitle}"`,
    projectId,
    taskId,
    userId,
    metadata: { prNumber },
  });
}

export async function logLabelAdded(
  projectId: string,
  taskId: string,
  taskTitle: string,
  labelName: string,
  userId: string
) {
  return createActivity({
    type: "LABEL_ADDED",
    description: `added label "${labelName}" to "${taskTitle}"`,
    projectId,
    taskId,
    userId,
    metadata: { labelName },
  });
}

export async function logLabelRemoved(
  projectId: string,
  taskId: string,
  taskTitle: string,
  labelName: string,
  userId: string
) {
  return createActivity({
    type: "LABEL_REMOVED",
    description: `removed label "${labelName}" from "${taskTitle}"`,
    projectId,
    taskId,
    userId,
    metadata: { labelName },
  });
}
