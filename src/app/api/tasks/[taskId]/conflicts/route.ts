import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  checkPRMergeStatus,
  getConflictingFiles,
  getConflictDetails,
  updatePRBranch,
  createOrUpdateFile,
} from "@/services/github";
import { generateConflictResolution } from "@/services/agent";
import { MergeConflictInfo } from "@/types";

interface RouteContext {
  params: Promise<{ taskId: string }>;
}

// GET - Check for conflicts and get conflict info
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await context.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            user: { select: { accessToken: true } },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!task.prNumber) {
      return NextResponse.json({ error: "Task has no PR" }, { status: 400 });
    }

    const [owner, repo] = task.project.githubRepo.split("/");
    const accessToken = task.project.user?.accessToken;

    if (!accessToken) {
      return NextResponse.json({ error: "No access token available for this project" }, { status: 400 });
    }

    // Check merge status
    const mergeStatus = await checkPRMergeStatus(
      accessToken,
      owner,
      repo,
      task.prNumber
    );

    // Get conflicting files if there are conflicts
    let conflictingFiles: { path: string; status: string }[] = [];
    if (mergeStatus.hasConflicts) {
      conflictingFiles = await getConflictingFiles(
        accessToken,
        owner,
        repo,
        task.prNumber
      );
    }

    const conflictInfo: MergeConflictInfo = {
      hasConflicts: mergeStatus.hasConflicts,
      mergeableState: mergeStatus.mergeableState,
      conflictingFiles: conflictingFiles.map((f) => ({ path: f.path })),
      behindByCommits: mergeStatus.behindBy,
      aheadByCommits: mergeStatus.aheadBy,
      baseBranch: task.project.defaultBranch,
      headBranch: task.branchName || "",
      lastChecked: new Date(),
    };

    // Update task with conflict info if there are conflicts
    if (mergeStatus.hasConflicts && task.status !== "HAS_CONFLICTS") {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "HAS_CONFLICTS",
          conflictInfo: JSON.parse(JSON.stringify(conflictInfo)) as Prisma.InputJsonValue,
        },
      });
    } else if (!mergeStatus.hasConflicts && task.status === "HAS_CONFLICTS") {
      // Clear conflict status if resolved
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "APPROVED",
          conflictInfo: Prisma.JsonNull,
        },
      });
    }

    return NextResponse.json({
      ...conflictInfo,
      canAutoUpdate: mergeStatus.behindBy > 0 && !mergeStatus.hasConflicts,
    });
  } catch (error) {
    console.error("Error checking conflicts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check conflicts" },
      { status: 500 }
    );
  }
}

// POST - Perform conflict resolution action
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await context.params;
    const body = await request.json();
    const { action } = body; // "update_branch" | "ai_resolve" | "manual_resolve"

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            user: { select: { accessToken: true } },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!task.prNumber || !task.branchName) {
      return NextResponse.json({ error: "Task has no PR" }, { status: 400 });
    }

    const [owner, repo] = task.project.githubRepo.split("/");
    const accessToken = task.project.user?.accessToken;

    if (!accessToken) {
      return NextResponse.json({ error: "No access token available for this project" }, { status: 400 });
    }

    if (action === "update_branch") {
      // Try to update branch by merging base into it
      const result = await updatePRBranch(accessToken, owner, repo, task.prNumber);

      if (result.success) {
        // Re-check merge status
        const mergeStatus = await checkPRMergeStatus(
          accessToken,
          owner,
          repo,
          task.prNumber
        );

        if (!mergeStatus.hasConflicts) {
          // Clear conflict status
          await prisma.task.update({
            where: { id: taskId },
            data: {
              status: "APPROVED",
              conflictInfo: Prisma.JsonNull,
            },
          });

          // Add activity comment
          await prisma.comment.create({
            data: {
              content: "Branch updated successfully - conflicts resolved",
              isSystem: true,
              type: "ACTIVITY",
              taskId,
              metadata: {
                activity_type: "branch_updated",
                sha: result.sha || "unknown",
              },
            },
          });
        }

        return NextResponse.json({
          success: true,
          message: result.message,
          conflictsResolved: !mergeStatus.hasConflicts,
        });
      } else {
        return NextResponse.json({
          success: false,
          message: result.message,
          needsAIResolution: result.message.includes("merge conflict"),
        });
      }
    } else if (action === "ai_resolve") {
      // Get detailed conflict information
      const conflictDetails = await getConflictDetails(
        accessToken,
        owner,
        repo,
        task.prNumber
      );

      if (conflictDetails.conflicts.length === 0) {
        return NextResponse.json({
          success: false,
          message: "No conflicts found to resolve",
        });
      }

      // Use AI to resolve conflicts
      const resolution = await generateConflictResolution(
        task.title,
        task.description,
        conflictDetails.conflicts,
        conflictDetails.baseBranch,
        conflictDetails.headBranch
      );

      if (!resolution.success || resolution.resolvedFiles.length === 0) {
        return NextResponse.json({
          success: false,
          message: resolution.error || "AI could not resolve conflicts",
        });
      }

      // Commit resolved files to branch sequentially
      for (const file of resolution.resolvedFiles) {
        await createOrUpdateFile(
          accessToken,
          owner,
          repo,
          file.path,
          file.content,
          `Resolve merge conflict in ${file.path}`,
          task.branchName
        );
      }

      // Re-check merge status
      const mergeStatus = await checkPRMergeStatus(
        accessToken,
        owner,
        repo,
        task.prNumber
      );

      if (!mergeStatus.hasConflicts) {
        // Clear conflict status
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: "APPROVED",
            conflictInfo: Prisma.JsonNull,
          },
        });

        // Add activity comment
        await prisma.comment.create({
          data: {
            content: `AI resolved merge conflicts in ${resolution.resolvedFiles.length} file(s):\n${resolution.summary}`,
            isSystem: true,
            type: "ACTIVITY",
            taskId,
            metadata: {
              activity_type: "conflicts_resolved",
              resolvedFiles: resolution.resolvedFiles.map((f) => f.path),
            },
          },
        });

        return NextResponse.json({
          success: true,
          message: "Conflicts resolved successfully",
          resolvedFiles: resolution.resolvedFiles.map((f) => f.path),
          summary: resolution.summary,
        });
      } else {
        return NextResponse.json({
          success: false,
          message: "Some conflicts remain - may need manual resolution",
          partiallyResolved: resolution.resolvedFiles.map((f) => f.path),
        });
      }
    } else if (action === "manual_resolve") {
      // Manual resolution: user provides resolved file contents
      const { resolvedFiles } = body as {
        resolvedFiles: Array<{ path: string; content: string }>;
      };

      if (!resolvedFiles || !Array.isArray(resolvedFiles) || resolvedFiles.length === 0) {
        return NextResponse.json(
          { error: "resolvedFiles array is required" },
          { status: 400 }
        );
      }

      // Validate each resolved file has path and content
      for (const file of resolvedFiles) {
        if (!file.path || typeof file.content !== "string") {
          return NextResponse.json(
            { error: "Each resolved file must have path and content" },
            { status: 400 }
          );
        }
      }

      // Commit resolved files to branch sequentially
      for (const file of resolvedFiles) {
        await createOrUpdateFile(
          accessToken,
          owner,
          repo,
          file.path,
          file.content,
          `Manually resolve merge conflict in ${file.path}`,
          task.branchName
        );
      }

      // Re-check merge status
      const mergeStatus = await checkPRMergeStatus(
        accessToken,
        owner,
        repo,
        task.prNumber
      );

      if (!mergeStatus.hasConflicts) {
        // Clear conflict status
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: "APPROVED",
            conflictInfo: Prisma.JsonNull,
          },
        });

        // Add activity comment
        await prisma.comment.create({
          data: {
            content: `Manually resolved merge conflicts in ${resolvedFiles.length} file(s):\n${resolvedFiles.map((f) => `- ${f.path}`).join("\n")}`,
            isSystem: true,
            type: "ACTIVITY",
            taskId,
            metadata: {
              activity_type: "conflicts_resolved_manually",
              resolvedFiles: resolvedFiles.map((f) => f.path),
            },
          },
        });

        return NextResponse.json({
          success: true,
          message: "Conflicts resolved successfully",
          resolvedFiles: resolvedFiles.map((f) => f.path),
        });
      } else {
        return NextResponse.json({
          success: false,
          message: "Some conflicts remain - please resolve all conflicting files",
          partiallyResolved: resolvedFiles.map((f) => f.path),
        });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error resolving conflicts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve conflicts" },
      { status: 500 }
    );
  }
}
