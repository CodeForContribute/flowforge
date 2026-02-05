import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

type WebhookTrigger =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "STATUS_CHANGED"
  | "PR_CREATED"
  | "PR_MERGED"
  | "COMMENT_ADDED"
  | "SPRINT_STARTED"
  | "SPRINT_COMPLETED";

interface WebhookPayload {
  event: WebhookTrigger;
  timestamp: string;
  project: {
    id: string;
    name: string;
    projectKey: string;
  };
  data: Record<string, unknown>;
}

/**
 * Dispatch webhooks for a specific event in a project
 */
export async function dispatchWebhooks(
  projectId: string,
  trigger: WebhookTrigger,
  data: Record<string, unknown>
) {
  try {
    // Get project info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, projectKey: true },
    });

    if (!project) {
      console.error("Project not found for webhook dispatch:", projectId);
      return;
    }

    // Get enabled webhooks that subscribe to this trigger
    const webhooks = await prisma.projectWebhook.findMany({
      where: {
        projectId,
        enabled: true,
        triggers: { has: trigger },
      },
    });

    if (webhooks.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event: trigger,
      timestamp: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        projectKey: project.projectKey,
      },
      data,
    };

    // Send webhooks concurrently (non-blocking)
    const deliveryPromises = webhooks.map((webhook) =>
      deliverWebhook(webhook.id, webhook.url, webhook.secret, trigger, payload)
    );

    // Don't await - let webhooks deliver in background
    Promise.allSettled(deliveryPromises).catch((error) => {
      console.error("Error in webhook delivery batch:", error);
    });
  } catch (error) {
    console.error("Error dispatching webhooks:", error);
  }
}

/**
 * Deliver a single webhook and log the result
 */
async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string | null,
  trigger: WebhookTrigger,
  payload: WebhookPayload
) {
  const payloadString = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "FlowForge-Webhook/1.0",
    "X-FlowForge-Event": trigger,
    "X-FlowForge-Delivery": crypto.randomUUID(),
  };

  // Add HMAC signature if secret is configured
  if (secret) {
    const signature = crypto
      .createHmac("sha256", secret)
      .update(payloadString)
      .digest("hex");
    headers["X-FlowForge-Signature"] = `sha256=${signature}`;
  }

  let success = false;
  let responseCode: number | null = null;
  let responseBody: string | null = null;
  let error: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    responseCode = response.status;
    success = response.ok;

    try {
      const text = await response.text();
      responseBody = text.substring(0, 1000); // Truncate to 1KB
    } catch {
      responseBody = null;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
    if (err instanceof Error && err.name === "AbortError") {
      error = "Request timed out";
    }
  }

  // Log the delivery
  try {
    await prisma.webhookDelivery.create({
      data: {
        webhookId,
        trigger,
        payload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
        responseCode,
        responseBody,
        success,
        error,
      },
    });
  } catch (logError) {
    console.error("Failed to log webhook delivery:", logError);
  }

  return { success, responseCode, error };
}

// Helper functions for common webhook events

export async function webhookTaskCreated(
  projectId: string,
  task: {
    id: string;
    title: string;
    taskKey: string;
    status: string;
    priority: string;
    taskType: string;
    assignee?: { name: string | null } | null;
  }
) {
  return dispatchWebhooks(projectId, "TASK_CREATED", {
    task: {
      id: task.id,
      title: task.title,
      taskKey: task.taskKey,
      status: task.status,
      priority: task.priority,
      taskType: task.taskType,
      assignee: task.assignee?.name || null,
    },
  });
}

export async function webhookTaskUpdated(
  projectId: string,
  task: {
    id: string;
    title: string;
    taskKey: string;
    status: string;
    priority: string;
  },
  changes: string[]
) {
  return dispatchWebhooks(projectId, "TASK_UPDATED", {
    task: {
      id: task.id,
      title: task.title,
      taskKey: task.taskKey,
      status: task.status,
      priority: task.priority,
    },
    changes,
  });
}

export async function webhookTaskDeleted(
  projectId: string,
  task: {
    id: string;
    title: string;
    taskKey: string;
  }
) {
  return dispatchWebhooks(projectId, "TASK_DELETED", {
    task: {
      id: task.id,
      title: task.title,
      taskKey: task.taskKey,
    },
  });
}

export async function webhookStatusChanged(
  projectId: string,
  task: {
    id: string;
    title: string;
    taskKey: string;
  },
  fromStatus: string,
  toStatus: string
) {
  return dispatchWebhooks(projectId, "STATUS_CHANGED", {
    task: {
      id: task.id,
      title: task.title,
      taskKey: task.taskKey,
    },
    fromStatus,
    toStatus,
  });
}

export async function webhookPrCreated(
  projectId: string,
  task: {
    id: string;
    title: string;
    taskKey: string;
  },
  pr: {
    number: number;
    url: string;
    title: string;
  }
) {
  return dispatchWebhooks(projectId, "PR_CREATED", {
    task: {
      id: task.id,
      title: task.title,
      taskKey: task.taskKey,
    },
    pullRequest: pr,
  });
}

export async function webhookPrMerged(
  projectId: string,
  task: {
    id: string;
    title: string;
    taskKey: string;
  },
  pr: {
    number: number;
    url: string;
  }
) {
  return dispatchWebhooks(projectId, "PR_MERGED", {
    task: {
      id: task.id,
      title: task.title,
      taskKey: task.taskKey,
    },
    pullRequest: pr,
  });
}

export async function webhookCommentAdded(
  projectId: string,
  task: {
    id: string;
    title: string;
    taskKey: string;
  },
  comment: {
    id: string;
    content: string;
    author: string | null;
  }
) {
  return dispatchWebhooks(projectId, "COMMENT_ADDED", {
    task: {
      id: task.id,
      title: task.title,
      taskKey: task.taskKey,
    },
    comment: {
      id: comment.id,
      content: comment.content.substring(0, 500), // Truncate
      author: comment.author,
    },
  });
}

export async function webhookSprintStarted(
  projectId: string,
  sprint: {
    id: string;
    name: string;
    goal: string | null;
    startDate: Date;
    endDate: Date;
  }
) {
  return dispatchWebhooks(projectId, "SPRINT_STARTED", {
    sprint: {
      id: sprint.id,
      name: sprint.name,
      goal: sprint.goal,
      startDate: sprint.startDate.toISOString(),
      endDate: sprint.endDate.toISOString(),
    },
  });
}

export async function webhookSprintCompleted(
  projectId: string,
  sprint: {
    id: string;
    name: string;
    goal: string | null;
  },
  stats: {
    completedTasks: number;
    totalTasks: number;
    completedPoints: number;
    totalPoints: number;
  }
) {
  return dispatchWebhooks(projectId, "SPRINT_COMPLETED", {
    sprint: {
      id: sprint.id,
      name: sprint.name,
      goal: sprint.goal,
    },
    stats,
  });
}
