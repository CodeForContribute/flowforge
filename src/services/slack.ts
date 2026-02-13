import { prisma } from "@/lib/prisma";

interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: unknown[];
  accessory?: unknown;
}

/**
 * Send a notification to Slack for a project
 */
export async function sendSlackNotification(
  projectId: string,
  message: SlackMessage
): Promise<boolean> {
  try {
    const integration = await prisma.slackIntegration.findUnique({
      where: { projectId },
    });

    if (!integration || !integration.enabled) {
      return false;
    }

    // We're using Slack incoming webhooks stored in accessToken
    // In a full implementation, this would use the Bot token with chat.postMessage
    const webhookUrl = integration.accessToken;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending Slack notification:", error);
    return false;
  }
}

// Helper functions for common notifications

export async function notifySlackTaskCreated(
  projectId: string,
  task: {
    title: string;
    taskKey: string;
    priority: string;
    assignee?: string | null;
  },
  creatorName: string,
  taskUrl: string
) {
  const integration = await prisma.slackIntegration.findUnique({
    where: { projectId },
  });

  if (!integration?.notifyTaskCreated) return;

  const priorityEmoji =
    task.priority === "URGENT"
      ? "🔴"
      : task.priority === "HIGH"
      ? "🟠"
      : task.priority === "MEDIUM"
      ? "🔵"
      : "⚪";

  await sendSlackNotification(projectId, {
    text: `New task created: ${task.taskKey} - ${task.title}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New Task Created*\n\n*<${taskUrl}|${task.taskKey}>* ${task.title}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${priorityEmoji} Priority: *${task.priority}*\n👤 Assignee: ${task.assignee || "Unassigned"}\n✏️ Created by: ${creatorName}`,
        },
      },
    ],
  });
}

export async function notifySlackStatusChanged(
  projectId: string,
  task: {
    title: string;
    taskKey: string;
  },
  fromStatus: string,
  toStatus: string,
  changerName: string,
  taskUrl: string
) {
  const integration = await prisma.slackIntegration.findUnique({
    where: { projectId },
  });

  if (!integration?.notifyStatusChanged) return;

  const statusEmoji =
    toStatus === "MERGED"
      ? "✅"
      : toStatus === "IN_PROGRESS"
      ? "🏃"
      : toStatus === "IN_REVIEW"
      ? "👀"
      : toStatus === "CLOSED"
      ? "🚫"
      : "📝";

  await sendSlackNotification(projectId, {
    text: `Task status changed: ${task.taskKey} - ${fromStatus} → ${toStatus}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${statusEmoji} *Status Changed*\n\n*<${taskUrl}|${task.taskKey}>* ${task.title}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `\`${fromStatus}\` → \`${toStatus}\`\n👤 Changed by: ${changerName}`,
        },
      },
    ],
  });
}

export async function notifySlackPrCreated(
  projectId: string,
  task: {
    title: string;
    taskKey: string;
  },
  pr: {
    number: number;
    url: string;
    title: string;
  },
  taskUrl: string
) {
  const integration = await prisma.slackIntegration.findUnique({
    where: { projectId },
  });

  if (!integration?.notifyPrCreated) return;

  await sendSlackNotification(projectId, {
    text: `PR opened for ${task.taskKey}: #${pr.number}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🔀 *Pull Request Opened*\n\n*<${taskUrl}|${task.taskKey}>* ${task.title}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<${pr.url}|PR #${pr.number}>*: ${pr.title}`,
        },
      },
    ],
  });
}

export async function notifySlackPrMerged(
  projectId: string,
  task: {
    title: string;
    taskKey: string;
  },
  pr: {
    number: number;
    url: string;
  },
  taskUrl: string
) {
  const integration = await prisma.slackIntegration.findUnique({
    where: { projectId },
  });

  if (!integration?.notifyPrMerged) return;

  await sendSlackNotification(projectId, {
    text: `PR merged for ${task.taskKey}: #${pr.number}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `✅ *Pull Request Merged*\n\n*<${taskUrl}|${task.taskKey}>* ${task.title}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<${pr.url}|PR #${pr.number}>* has been merged!`,
        },
      },
    ],
  });
}

export async function notifySlackComment(
  projectId: string,
  task: {
    title: string;
    taskKey: string;
  },
  comment: {
    content: string;
    author: string;
  },
  taskUrl: string
) {
  const integration = await prisma.slackIntegration.findUnique({
    where: { projectId },
  });

  if (!integration?.notifyComments) return;

  // Truncate long comments
  const truncatedContent =
    comment.content.length > 200
      ? comment.content.substring(0, 200) + "..."
      : comment.content;

  await sendSlackNotification(projectId, {
    text: `New comment on ${task.taskKey} by ${comment.author}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `💬 *New Comment*\n\n*<${taskUrl}|${task.taskKey}>* ${task.title}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${comment.author}*: ${truncatedContent}`,
        },
      },
    ],
  });
}
