import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  taskIds: z.array(z.string()).min(1).max(100),
  action: z.enum([
    "set_status",
    "set_priority",
    "assign",
    "unassign",
    "add_labels",
    "remove_labels",
    "set_sprint",
    "remove_from_sprint",
    "delete",
  ]),
  value: z.union([z.string(), z.array(z.string())]).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { taskIds, action, value } = bulkUpdateSchema.parse(body);

    // Verify all tasks exist and user has access
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
      },
      select: { id: true, projectId: true },
    });

    if (tasks.length !== taskIds.length) {
      return NextResponse.json(
        { error: "Some tasks not found or access denied" },
        { status: 404 }
      );
    }

    // Ensure all tasks belong to the same project for bulk operations
    const projectIds = Array.from(new Set(tasks.map((t) => t.projectId)));
    if (projectIds.length > 1) {
      return NextResponse.json(
        { error: "Bulk operations can only be performed on tasks from the same project" },
        { status: 400 }
      );
    }

    const projectId = projectIds[0];
    let updatedCount = 0;

    switch (action) {
      case "set_status":
        if (!value || typeof value !== "string") {
          return NextResponse.json({ error: "Status value required" }, { status: 400 });
        }
        await prisma.task.updateMany({
          where: { id: { in: taskIds } },
          data: { status: value as "BACKLOG" | "TODO" | "IN_PROGRESS" | "GENERATING" | "AWAITING_CODE_REVIEW" | "PR_OPEN" | "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "HAS_CONFLICTS" | "MERGED" | "CLOSED" },
        });
        updatedCount = taskIds.length;
        break;

      case "set_priority":
        if (!value || typeof value !== "string") {
          return NextResponse.json({ error: "Priority value required" }, { status: 400 });
        }
        await prisma.task.updateMany({
          where: { id: { in: taskIds } },
          data: { priority: value as "LOW" | "MEDIUM" | "HIGH" | "URGENT" },
        });
        updatedCount = taskIds.length;
        break;

      case "assign":
        if (!value || typeof value !== "string") {
          return NextResponse.json({ error: "Assignee ID required" }, { status: 400 });
        }
        // Verify assignee is a project member
        const assignee = await prisma.project.findFirst({
          where: {
            id: projectId,
            OR: [
              { userId: value },
              { members: { some: { userId: value } } },
            ],
          },
        });
        if (!assignee) {
          return NextResponse.json({ error: "Assignee must be a project member" }, { status: 400 });
        }
        await prisma.task.updateMany({
          where: { id: { in: taskIds } },
          data: { assigneeId: value },
        });
        updatedCount = taskIds.length;
        break;

      case "unassign":
        await prisma.task.updateMany({
          where: { id: { in: taskIds } },
          data: { assigneeId: null },
        });
        updatedCount = taskIds.length;
        break;

      case "add_labels":
        if (!value || !Array.isArray(value) || value.length === 0) {
          return NextResponse.json({ error: "Label IDs required" }, { status: 400 });
        }
        // Add labels to each task individually (many-to-many requires individual updates)
        for (const taskId of taskIds) {
          await prisma.task.update({
            where: { id: taskId },
            data: {
              labels: {
                connect: value.map((id) => ({ id })),
              },
            },
          });
          updatedCount++;
        }
        break;

      case "remove_labels":
        if (!value || !Array.isArray(value) || value.length === 0) {
          return NextResponse.json({ error: "Label IDs required" }, { status: 400 });
        }
        for (const taskId of taskIds) {
          await prisma.task.update({
            where: { id: taskId },
            data: {
              labels: {
                disconnect: value.map((id) => ({ id })),
              },
            },
          });
          updatedCount++;
        }
        break;

      case "set_sprint":
        if (!value || typeof value !== "string") {
          return NextResponse.json({ error: "Sprint ID required" }, { status: 400 });
        }
        // Verify sprint belongs to project
        const sprint = await prisma.sprint.findFirst({
          where: { id: value, projectId },
        });
        if (!sprint) {
          return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
        }
        await prisma.task.updateMany({
          where: { id: { in: taskIds } },
          data: { sprintId: value },
        });
        updatedCount = taskIds.length;
        break;

      case "remove_from_sprint":
        await prisma.task.updateMany({
          where: { id: { in: taskIds } },
          data: { sprintId: null },
        });
        updatedCount = taskIds.length;
        break;

      case "delete":
        // Check for tasks with subtasks
        const tasksWithSubtasks = await prisma.task.findMany({
          where: {
            id: { in: taskIds },
            subtasks: { some: {} },
          },
          select: { id: true, taskKey: true },
        });

        if (tasksWithSubtasks.length > 0) {
          return NextResponse.json(
            {
              error: `Cannot delete tasks with subtasks: ${tasksWithSubtasks
                .map((t) => t.taskKey)
                .join(", ")}`,
            },
            { status: 400 }
          );
        }

        await prisma.task.deleteMany({
          where: { id: { in: taskIds } },
        });
        updatedCount = taskIds.length;
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      action,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error performing bulk operation:", error);
    return NextResponse.json({ error: "Failed to perform bulk operation" }, { status: 500 });
  }
}
