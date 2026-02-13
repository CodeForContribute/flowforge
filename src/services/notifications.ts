import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { Resend } from "resend";

// Initialize Resend client if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "FlowForge <notifications@flowforge.dev>";

interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  projectId?: string;
}

interface TaskNotificationContext {
  taskId: string;
  taskTitle: string;
  taskKey?: string;
  projectName: string;
  prNumber?: number;
  prUrl?: string;
  branchName?: string;
}

/**
 * Check if a user has a specific notification preference enabled
 */
async function getUserNotificationPreference(
  userId: string,
  notificationType: NotificationType
): Promise<boolean> {
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  // Default to true if no preferences set
  if (!preferences) return true;

  switch (notificationType) {
    case "PR_CREATED":
      return preferences.notifyPrCreated;
    case "PR_MERGED":
      return preferences.notifyPrMerged;
    case "REVIEW_REQUESTED":
      return preferences.notifyReviewRequested;
    case "TASK_COMPLETED":
      return preferences.notifyTaskCompleted;
    case "TASK_FAILED":
      return preferences.notifyTaskFailed;
    default:
      return true;
  }
}

/**
 * Get user's email address
 */
async function getUserEmail(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email || null;
}

/**
 * Send an email notification
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!resend) {
    console.log(`[Notifications] Email not sent (no RESEND_API_KEY): ${subject}`);
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`[Notifications] Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error("[Notifications] Failed to send email:", error);
    return false;
  }
}

/**
 * Generate HTML email content
 */
function generateEmailHtml(
  title: string,
  message: string,
  context?: TaskNotificationContext
): string {
  const prLink = context?.prUrl
    ? `<p><a href="${context.prUrl}" style="color: #6366f1; text-decoration: none;">View Pull Request #${context.prNumber}</a></p>`
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">FlowForge</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #18181b; margin-top: 0;">${title}</h2>
          <p style="color: #52525b; line-height: 1.6;">${message}</p>
          ${context?.taskTitle ? `
            <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; color: #71717a; font-size: 12px; text-transform: uppercase;">Task</p>
              <p style="margin: 4px 0 0; color: #18181b; font-weight: 600;">${context.taskTitle}</p>
              ${context.projectName ? `<p style="margin: 4px 0 0; color: #71717a; font-size: 14px;">in ${context.projectName}</p>` : ""}
            </div>
          ` : ""}
          ${prLink}
        </div>
        <div style="background-color: #f4f4f5; padding: 16px; text-align: center;">
          <p style="margin: 0; color: #71717a; font-size: 12px;">
            You can manage your notification preferences in your <a href="${process.env.NEXTAUTH_URL}/settings/notifications" style="color: #6366f1;">account settings</a>.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Create a notification and optionally send an email
 */
export async function createNotification(data: NotificationData): Promise<void> {
  const { userId, type, title, message, taskId, projectId } = data;

  // Check user preferences
  const shouldNotify = await getUserNotificationPreference(userId, type);
  if (!shouldNotify) {
    console.log(`[Notifications] User ${userId} has ${type} notifications disabled, skipping`);
    return;
  }

  // Create in-app notification
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      taskId,
      projectId,
    },
  });

  // Send email notification
  const email = await getUserEmail(userId);
  if (email) {
    const html = generateEmailHtml(title, message);
    const emailSent = await sendEmail(email, `[FlowForge] ${title}`, html);

    // Update notification with email status
    if (emailSent) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { emailSent: true },
      });
    }
  }
}

/**
 * Notify when a PR is created
 */
export async function notifyPRCreated(
  userId: string,
  context: TaskNotificationContext
): Promise<void> {
  const taskLabel = context.taskKey ? `${context.taskKey}: ${context.taskTitle}` : context.taskTitle;
  await createNotification({
    userId,
    type: "PR_CREATED",
    title: "Pull Request Created",
    message: `A new pull request has been created for "${taskLabel}" in ${context.projectName}.`,
    taskId: context.taskId,
  });
}

/**
 * Notify when a PR is merged
 */
export async function notifyPRMerged(
  userId: string,
  context: TaskNotificationContext
): Promise<void> {
  const taskLabel = context.taskKey ? `${context.taskKey}: ${context.taskTitle}` : context.taskTitle;
  await createNotification({
    userId,
    type: "PR_MERGED",
    title: "Pull Request Merged",
    message: `The pull request for "${taskLabel}" has been merged into ${context.branchName || "main"}.`,
    taskId: context.taskId,
  });
}

/**
 * Notify when changes are requested on a PR
 */
export async function notifyReviewRequested(
  userId: string,
  context: TaskNotificationContext,
  reviewerName?: string
): Promise<void> {
  const taskLabel = context.taskKey ? `${context.taskKey}: ${context.taskTitle}` : context.taskTitle;
  await createNotification({
    userId,
    type: "REVIEW_REQUESTED",
    title: "Changes Requested",
    message: `${reviewerName || "A reviewer"} has requested changes on the pull request for "${taskLabel}".`,
    taskId: context.taskId,
  });
}

/**
 * Notify when a task execution completes successfully
 */
export async function notifyTaskCompleted(
  userId: string,
  context: TaskNotificationContext
): Promise<void> {
  const taskLabel = context.taskKey ? `${context.taskKey}: ${context.taskTitle}` : context.taskTitle;
  await createNotification({
    userId,
    type: "TASK_COMPLETED",
    title: "Task Execution Completed",
    message: `The task "${taskLabel}" has been successfully executed and a PR has been created.`,
    taskId: context.taskId,
  });
}

/**
 * Notify when a task execution fails
 */
export async function notifyTaskFailed(
  userId: string,
  context: TaskNotificationContext,
  errorMessage?: string
): Promise<void> {
  const taskLabel = context.taskKey ? `${context.taskKey}: ${context.taskTitle}` : context.taskTitle;
  await createNotification({
    userId,
    type: "TASK_FAILED",
    title: "Task Execution Failed",
    message: `The task "${taskLabel}" failed to execute.${errorMessage ? ` Error: ${errorMessage}` : ""}`,
    taskId: context.taskId,
  });
}

interface CodeReviewNotificationContext {
  taskId: string;
  taskTitle: string;
  taskKey?: string;
  projectName: string;
  fileCount: number;
  version: number;
}

/**
 * Notify when generated code is ready for review
 */
export async function notifyCodeReviewReady(
  userId: string,
  context: CodeReviewNotificationContext
): Promise<void> {
  const taskLabel = context.taskKey ? `${context.taskKey}: ${context.taskTitle}` : context.taskTitle;
  const versionText = context.version > 1 ? ` (version ${context.version})` : "";
  await createNotification({
    userId,
    type: "CODE_REVIEW_READY",
    title: "Code Ready for Review",
    message: `Generated code for "${taskLabel}"${versionText} is ready for your review. ${context.fileCount} file${context.fileCount > 1 ? "s" : ""} generated.`,
    taskId: context.taskId,
  });
}

/**
 * Notify when a user is mentioned in a comment
 */
export async function notifyMention(
  mentionedUserId: string,
  mentionerName: string,
  taskId: string,
  taskTitle: string,
  projectName: string,
  commentPreview: string
): Promise<void> {
  await createNotification({
    userId: mentionedUserId,
    type: "MENTIONED",
    title: "You were mentioned",
    message: `${mentionerName} mentioned you in a comment on "${taskTitle}" in ${projectName}: "${commentPreview.substring(0, 100)}${commentPreview.length > 100 ? "..." : ""}"`,
    taskId,
  });
}

/**
 * Notify watchers when a task is updated
 */
export async function notifyWatchersTaskUpdated(
  taskId: string,
  taskTitle: string,
  projectName: string,
  updaterName: string,
  updateDescription: string,
  excludeUserId?: string
): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      watchers: {
        select: { id: true },
      },
    },
  });

  if (!task) return;

  for (const watcher of task.watchers) {
    // Don't notify the person who made the update
    if (watcher.id === excludeUserId) continue;

    await createNotification({
      userId: watcher.id,
      type: "TASK_UPDATED",
      title: "Task Updated",
      message: `${updaterName} ${updateDescription} on "${taskTitle}" in ${projectName}`,
      taskId,
    });
  }
}

/**
 * Notify watchers when a comment is added to a task
 */
export async function notifyWatchersCommentAdded(
  taskId: string,
  taskTitle: string,
  projectName: string,
  commenterName: string,
  commentPreview: string,
  excludeUserIds: string[] = []
): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      watchers: {
        select: { id: true },
      },
    },
  });

  if (!task) return;

  for (const watcher of task.watchers) {
    // Don't notify excluded users (commenter, mentioned users who already got notified)
    if (excludeUserIds.includes(watcher.id)) continue;

    await createNotification({
      userId: watcher.id,
      type: "COMMENT_ADDED",
      title: "New Comment",
      message: `${commenterName} commented on "${taskTitle}" in ${projectName}: "${commentPreview.substring(0, 100)}${commentPreview.length > 100 ? "..." : ""}"`,
      taskId,
    });
  }
}

/**
 * Get watchers for a task
 */
export async function getTaskWatchers(taskId: string): Promise<string[]> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      watchers: {
        select: { id: true },
      },
    },
  });

  return task?.watchers.map((w) => w.id) || [];
}

/**
 * Parse @mentions from comment content and return user IDs
 */
export async function parseMentions(
  content: string,
  projectId: string
): Promise<{ userId: string; username: string }[]> {
  // Match @username patterns (alphanumeric, underscore, hyphen)
  const mentionPattern = /@([a-zA-Z0-9_-]+)/g;
  const matches = Array.from(content.matchAll(mentionPattern));
  const usernames = Array.from(new Set(matches.map((m) => m[1])));

  if (usernames.length === 0) return [];

  // Find users who are members of the project
  const members = await prisma.projectMember.findMany({
    where: {
      projectId,
      user: {
        name: { in: usernames, mode: "insensitive" },
      },
    },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  // Also check the project owner
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  const result: { userId: string; username: string }[] = [];

  // Add members
  for (const member of members) {
    if (member.user.name) {
      result.push({ userId: member.user.id, username: member.user.name });
    }
  }

  // Add project owner if mentioned (for personal projects)
  const projectUser = project?.user;
  if (projectUser?.name && usernames.some((u) => u.toLowerCase() === projectUser.name?.toLowerCase())) {
    if (!result.some((r) => r.userId === projectUser.id)) {
      result.push({ userId: projectUser.id, username: projectUser.name });
    }
  }

  return result;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 20,
  includeRead: boolean = true
) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(includeRead ? {} : { read: false }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      task: {
        select: {
          id: true,
          title: true,
          projectId: true,
        },
      },
    },
  });
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(
  userId: string,
  notificationIds?: string[]
): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      userId,
      ...(notificationIds ? { id: { in: notificationIds } } : {}),
    },
    data: { read: true },
  });
}
