import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addContinueExecutionJob, addContinueCommentResponseJob } from "@/lib/queue";
import { regenerateCode, rejectCodeReview } from "@/services/execution";
import { isTaskKey } from "@/lib/task-lookup";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

interface GeneratedFile {
  path: string;
  content: string;
  action: "create" | "update" | "delete";
}

interface CodeReviewRequest {
  action: "approve" | "request_changes" | "reject";
  generatedCodeId: string;
  feedback?: string;
  deleteBranch?: boolean;
  updatedFiles?: GeneratedFile[];
}

/**
 * POST /api/tasks/[taskId]/code-review
 * Handle code review actions: approve, request_changes, or reject
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: CodeReviewRequest = await request.json();
    const { action, generatedCodeId, feedback, deleteBranch, updatedFiles } = body;

    if (!action || !generatedCodeId) {
      return NextResponse.json(
        { error: "Missing required fields: action and generatedCodeId" },
        { status: 400 }
      );
    }

    if (!["approve", "request_changes", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be: approve, request_changes, or reject" },
        { status: 400 }
      );
    }

    if (action === "request_changes" && !feedback) {
      return NextResponse.json(
        { error: "Feedback is required when requesting changes" },
        { status: 400 }
      );
    }

    // Build where clause based on identifier type (cuid or taskKey)
    const whereClause = isTaskKey(taskId)
      ? { taskKey: taskId }
      : { id: taskId };

    // Verify task ownership and current state
    const task = await prisma.task.findFirst({
      where: {
        ...whereClause,
        project: {
          userId: session.user.id,
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.status !== "AWAITING_CODE_REVIEW") {
      return NextResponse.json(
        { error: "Task is not awaiting code review" },
        { status: 400 }
      );
    }

    // Verify the generated code exists and belongs to this task
    const generatedCode = await prisma.generatedCode.findUnique({
      where: { id: generatedCodeId },
    });

    if (!generatedCode || generatedCode.taskId !== task.id) {
      return NextResponse.json(
        { error: "Generated code not found" },
        { status: 404 }
      );
    }

    if (generatedCode.status !== "PENDING_REVIEW") {
      return NextResponse.json(
        { error: "Generated code is not pending review" },
        { status: 400 }
      );
    }

    switch (action) {
      case "approve": {
        // Update generated code status to APPROVED, with edited files if provided
        await prisma.generatedCode.update({
          where: { id: generatedCodeId },
          data: {
            status: "APPROVED",
            reviewedAt: new Date(),
            ...(updatedFiles ? { files: updatedFiles } : {}),
          },
        });

        // Queue the appropriate continue job based on type
        let jobId: string;

        if (generatedCode.type === "PR_COMMENT_RESPONSE") {
          // This is a PR comment response - use the comment response queue
          jobId = await addContinueCommentResponseJob({
            taskId: task.id,
            userId: session.user.id,
            generatedCodeId,
            prNumber: task.prNumber!,
            commentAuthor: generatedCode.prCommentAuthor || "reviewer",
          });
        } else {
          // This is an initial execution - use the standard continue queue
          jobId = await addContinueExecutionJob({
            taskId: task.id,
            userId: session.user.id,
            generatedCodeId,
          });
        }

        return NextResponse.json({
          success: true,
          message: "Code approved, execution continuing...",
          jobId,
        });
      }

      case "request_changes": {
        // Update generated code status to CHANGES_REQUESTED
        await prisma.generatedCode.update({
          where: { id: generatedCodeId },
          data: {
            status: "CHANGES_REQUESTED",
            userFeedback: feedback,
            reviewedAt: new Date(),
          },
        });

        // Regenerate code with feedback
        // This will create a new version with PENDING_REVIEW status
        await regenerateCode({
          taskId: task.id,
          userId: session.user.id,
          feedback: feedback!,
        });

        return NextResponse.json({
          success: true,
          message: "Changes requested, regenerating code with feedback...",
        });
      }

      case "reject": {
        // Update generated code status to REJECTED
        await prisma.generatedCode.update({
          where: { id: generatedCodeId },
          data: {
            status: "REJECTED",
            reviewedAt: new Date(),
          },
        });

        // Reset task status
        await rejectCodeReview(task.id, session.user.id, deleteBranch ?? false);

        return NextResponse.json({
          success: true,
          message: "Code rejected, task reset to editable state",
        });
      }
    }
  } catch (error) {
    console.error("Error processing code review:", error);
    return NextResponse.json(
      { error: "Failed to process code review" },
      { status: 500 }
    );
  }
}
