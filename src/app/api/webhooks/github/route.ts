import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import { addReviewHandlingJob, addApprovalHandlingJob, addPRCommentHandlingJob } from "@/lib/queue";
import { Prisma } from "@prisma/client";
import {
  notifyPRCreated,
  notifyPRMerged,
  notifyReviewRequested,
} from "@/services/notifications";
import { getPRSummary, type PRSummary } from "@/services/github";
import { parseGitHubRepo } from "@/lib/utils";

// Verify GitHub webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const expectedSignature = `sha256=${createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;

  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("GITHUB_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");
  const deliveryId = request.headers.get("x-github-delivery");

  const payload = await request.text();

  // Verify signature
  if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
    console.error("Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Log webhook event
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      eventType: event || "unknown",
      payload: body as Prisma.InputJsonValue,
    },
  });

  try {
    switch (event) {
      case "pull_request_review": {
        await handlePullRequestReview(body);
        break;
      }
      case "pull_request_review_comment": {
        await handlePullRequestReviewComment(body);
        break;
      }
      case "issue_comment": {
        await handleIssueComment(body);
        break;
      }
      case "pull_request": {
        await handlePullRequest(body);
        break;
      }
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    // Mark as processed
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processed: true, processedAt: new Date() },
    });

    return NextResponse.json({ success: true, deliveryId });
  } catch (error) {
    console.error("Error processing webhook:", error);

    // Record error
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handlePullRequestReview(body: Record<string, unknown>): Promise<void> {
  const review = body.review as Record<string, unknown> | undefined;
  const pullRequest = body.pull_request as Record<string, unknown> | undefined;
  const action = body.action as string | undefined;

  if (!review || !pullRequest || action !== "submitted") {
    return;
  }

  const reviewState = review.state as string;
  const prNumber = pullRequest.number as number;
  const headRef = (pullRequest.head as Record<string, unknown>).ref as string;
  const reviewerName = (review.user as Record<string, unknown>)?.login as string;

  // Find task by branch name with project info
  const task = await prisma.task.findFirst({
    where: {
      branchName: headRef,
      prNumber: prNumber,
    },
    include: {
      project: true,
    },
  });

  if (!task) {
    console.log(`No task found for PR #${prNumber} branch ${headRef}`);
    return;
  }

  if (reviewState === "approved") {
    // Queue approval handling
    await addApprovalHandlingJob({
      taskId: task.id,
      prNumber,
    });

    console.log(`Queued approval handling for task ${task.id}`);
  } else if (reviewState === "changes_requested") {
    // Send notification for changes requested
    await notifyReviewRequested(
      task.project.userId,
      {
        taskId: task.id,
        taskTitle: task.title,
        projectName: task.project.name,
        prNumber,
        prUrl: task.prUrl || undefined,
        branchName: task.branchName || undefined,
      },
      reviewerName
    );

    // Queue review response
    await addReviewHandlingJob({
      taskId: task.id,
      prNumber,
      reviewId: review.id as number,
    });

    console.log(`Queued review handling for task ${task.id}`);
  }
}

async function handlePullRequestReviewComment(
  body: Record<string, unknown>
): Promise<void> {
  const comment = body.comment as Record<string, unknown> | undefined;
  const pullRequest = body.pull_request as Record<string, unknown> | undefined;
  const action = body.action as string | undefined;

  if (!comment || !pullRequest || action !== "created") {
    return;
  }

  const prNumber = pullRequest.number as number;
  const headRef = (pullRequest.head as Record<string, unknown>).ref as string;

  // Find task by branch name
  const task = await prisma.task.findFirst({
    where: {
      branchName: headRef,
      prNumber: prNumber,
    },
  });

  if (!task) {
    console.log(`No task found for PR #${prNumber} branch ${headRef}`);
    return;
  }

  // Only respond if the task is in review
  if (task.status !== "IN_REVIEW" && task.status !== "CHANGES_REQUESTED") {
    return;
  }

  // Queue review response - using 0 as reviewId since this is a comment
  await addReviewHandlingJob({
    taskId: task.id,
    prNumber,
    reviewId: 0,
  });

  console.log(`Queued review comment handling for task ${task.id}`);
}

async function handlePullRequest(body: Record<string, unknown>): Promise<void> {
  const pullRequest = body.pull_request as Record<string, unknown> | undefined;
  const action = body.action as string | undefined;

  if (!pullRequest) {
    return;
  }

  const prNumber = pullRequest.number as number;
  const headRef = (pullRequest.head as Record<string, unknown>).ref as string;
  const merged = pullRequest.merged as boolean;
  const prUrl = pullRequest.html_url as string;

  // Find task by branch name with project and user info
  const task = await prisma.task.findFirst({
    where: {
      branchName: headRef,
      prNumber: prNumber,
    },
    include: {
      project: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!task) {
    console.log(`No task found for PR #${prNumber} branch ${headRef}`);
    return;
  }

  // Handle PR opened - no comment, just update status
  if (action === "opened") {
    // Update task with PR info if not already set
    if (!task.prNumber) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          prNumber,
          prUrl,
          status: "PR_OPEN"
        },
      });
    }

    // Send notification for PR created
    await notifyPRCreated(task.project.userId, {
      taskId: task.id,
      taskTitle: task.title,
      projectName: task.project.name,
      prNumber,
      prUrl,
      branchName: headRef,
    });

    console.log(`PR opened notification sent for task ${task.id}`);
  }

  if (action === "closed") {
    if (merged) {
      // PR was merged - create comprehensive summary comment
      await prisma.task.update({
        where: { id: task.id },
        data: { status: "MERGED" },
      });

      // Fetch PR summary from GitHub and create comprehensive comment
      const repoInfo = parseGitHubRepo(task.project.githubRepo);
      if (repoInfo) {
        try {
          const prSummary = await getPRSummary(
            task.project.user.accessToken,
            repoInfo.owner,
            repoInfo.repo,
            prNumber
          );

          const summaryComment = formatMergeSummary(prSummary);

          await prisma.comment.create({
            data: {
              taskId: task.id,
              content: summaryComment,
              type: "ACTIVITY",
              isSystem: true,
              metadata: {
                type: "pr_merged",
                prNumber,
                prUrl: prSummary.prUrl,
                branchName: prSummary.branchName,
                baseBranch: prSummary.baseBranch,
                filesChanged: prSummary.totalChangedFiles,
                additions: prSummary.totalAdditions,
                deletions: prSummary.totalDeletions,
                commits: prSummary.commits.length,
              } as Prisma.InputJsonValue,
            },
          });
        } catch (error) {
          console.error("Failed to fetch PR summary:", error);
          // Fall back to simple comment if GitHub API fails
          await prisma.comment.create({
            data: {
              taskId: task.id,
              content: `Pull request #${prNumber} was merged into \`${task.project.defaultBranch}\`.`,
              isSystem: true,
            },
          });
        }
      }

      // Send notification for PR merged
      await notifyPRMerged(task.project.userId, {
        taskId: task.id,
        taskTitle: task.title,
        projectName: task.project.name,
        prNumber,
        prUrl: prUrl || task.prUrl || undefined,
        branchName: task.branchName || task.project.defaultBranch,
      });

      console.log(`Task ${task.id} marked as MERGED with comprehensive summary`);
    } else {
      // PR was closed without merging
      await prisma.task.update({
        where: { id: task.id },
        data: { status: "CLOSED" },
      });

      await prisma.comment.create({
        data: {
          taskId: task.id,
          content: `Pull request #${prNumber} was closed without merging.`,
          isSystem: true,
        },
      });

      console.log(`Task ${task.id} marked as CLOSED`);
    }
  }
}

function formatMergeSummary(prSummary: PRSummary): string {
  const { prNumber, branchName, baseBranch, files, totalAdditions, totalDeletions, commits } = prSummary;

  // Build activities array in the same format as activity_summary
  const activities: { icon: string; label: string; detail?: string }[] = [];

  // Merged branch info
  activities.push({
    icon: "merge",
    label: "Merged branch",
    detail: `${branchName} → ${baseBranch}`,
  });

  // Files changed summary
  activities.push({
    icon: "code",
    label: `Changed ${files.length} file${files.length !== 1 ? "s" : ""}`,
    detail: `+${totalAdditions}, -${totalDeletions}`,
  });

  // List individual files (up to 5)
  const filesToShow = files.slice(0, 5);
  for (const file of filesToShow) {
    const statusIcon = file.status === "added" ? "+" : file.status === "removed" ? "-" : "~";
    activities.push({
      icon: "file",
      label: `${statusIcon} ${file.filename}`,
      detail: `+${file.additions}, -${file.deletions}`,
    });
  }

  if (files.length > 5) {
    activities.push({
      icon: "file",
      label: `...and ${files.length - 5} more file${files.length - 5 !== 1 ? "s" : ""}`,
    });
  }

  // Commits summary
  activities.push({
    icon: "commit",
    label: `${commits.length} commit${commits.length !== 1 ? "s" : ""}`,
    detail: commits[0]?.message || "",
  });

  const summary = JSON.stringify({
    type: "activity_summary",
    title: `PR #${prNumber} Merged Successfully`,
    activities,
  });

  return summary;
}

async function handleIssueComment(body: Record<string, unknown>): Promise<void> {
  const comment = body.comment as Record<string, unknown> | undefined;
  const issue = body.issue as Record<string, unknown> | undefined;
  const action = body.action as string | undefined;

  // Only process new comments on PRs
  if (!comment || !issue || action !== "created") {
    return;
  }

  // Check if this is a PR (issues have pull_request field when they are PRs)
  const pullRequestRef = issue.pull_request as Record<string, unknown> | undefined;
  if (!pullRequestRef) {
    // This is a regular issue comment, not a PR comment
    return;
  }

  const commentBody = comment.body as string;
  const commentId = comment.id as number;
  const commentAuthor = (comment.user as Record<string, unknown>)?.login as string;
  const prNumber = issue.number as number;

  // Skip bot comments to avoid infinite loops
  const authorAssociation = comment.author_association as string;
  if (commentAuthor?.includes("[bot]") || authorAssociation === "NONE") {
    // Optionally skip comments from bots or users with no association
    // For now, we'll skip obvious bot comments
    if (commentAuthor?.includes("[bot]")) {
      console.log(`Skipping bot comment from ${commentAuthor}`);
      return;
    }
  }

  // Skip our own comments (FlowForge agent comments)
  if (commentBody.includes("FlowForge AI agent")) {
    console.log("Skipping FlowForge agent comment to avoid loops");
    return;
  }

  // We need to find the task by PR number
  // Since issue_comment doesn't give us the branch directly, we query by prNumber
  const task = await prisma.task.findFirst({
    where: {
      prNumber: prNumber,
    },
  });

  if (!task) {
    console.log(`No task found for PR #${prNumber}`);
    return;
  }

  // Only respond if the task is in an active state
  const activeStatuses = ["PR_OPEN", "IN_REVIEW", "CHANGES_REQUESTED"];
  if (!activeStatuses.includes(task.status)) {
    console.log(`Task ${task.id} is in status ${task.status}, skipping comment handling`);
    return;
  }

  // Queue the comment for intelligent handling
  await addPRCommentHandlingJob({
    taskId: task.id,
    prNumber,
    commentId,
    commentBody,
    commentAuthor,
  });

  console.log(`Queued PR comment handling for task ${task.id}: comment #${commentId} by @${commentAuthor}`);
}
