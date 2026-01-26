import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import { addReviewHandlingJob, addApprovalHandlingJob } from "@/lib/queue";
import { Prisma } from "@prisma/client";

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

  if (reviewState === "approved") {
    // Queue approval handling
    await addApprovalHandlingJob({
      taskId: task.id,
      prNumber,
    });

    console.log(`Queued approval handling for task ${task.id}`);
  } else if (reviewState === "changes_requested") {
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

  if (action === "closed") {
    if (merged) {
      // PR was merged
      await prisma.task.update({
        where: { id: task.id },
        data: { status: "MERGED" },
      });

      await prisma.comment.create({
        data: {
          taskId: task.id,
          content: `Pull request #${prNumber} was merged!`,
          isSystem: true,
        },
      });

      console.log(`Task ${task.id} marked as MERGED`);
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
