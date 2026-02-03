import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyWatchersTaskUpdated } from "@/services/notifications";
import { isTaskKey } from "@/lib/task-lookup";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  status: z
    .enum([
      "BACKLOG",
      "TODO",
      "IN_PROGRESS",
      "GENERATING",
      "PR_OPEN",
      "IN_REVIEW",
      "CHANGES_REQUESTED",
      "APPROVED",
      "MERGED",
      "CLOSED",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  taskType: z.enum(["EPIC", "STORY", "TASK", "SUBTASK", "BUG"]).optional(),
  storyPoints: z.number().int().min(0).max(100).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
  parentTaskId: z.string().nullable().optional(),
  baseBranch: z.string().nullable().optional(),
  labelIds: z.array(z.string()).optional(),
  generatedPrompt: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Build where clause based on identifier type (cuid or taskKey)
    const whereClause = isTaskKey(taskId)
      ? { taskKey: taskId }
      : { id: taskId };

    const task = await prisma.task.findFirst({
      where: {
        ...whereClause,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
      },
      include: {
        project: true,
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        sprint: {
          select: { id: true, name: true, status: true, startDate: true, endDate: true },
        },
        parentTask: {
          select: { id: true, title: true, taskType: true, status: true },
        },
        subtasks: {
          select: {
            id: true,
            title: true,
            taskType: true,
            status: true,
            priority: true,
            storyPoints: true,
            assignee: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        labels: true,
        comments: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
        executions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Normalize empty strings to null for optional ID fields
    if (body.sprintId === "") body.sprintId = null;
    if (body.assigneeId === "") body.assigneeId = null;
    if (body.parentTaskId === "") body.parentTaskId = null;

    const data = updateTaskSchema.parse(body);

    // Build where clause based on identifier type (cuid or taskKey)
    const whereClause = isTaskKey(taskId)
      ? { taskKey: taskId }
      : { id: taskId };

    // Verify task access
    const existingTask = await prisma.task.findFirst({
      where: {
        ...whereClause,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
      },
      include: { project: true },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Validate parent task if being updated
    if (data.parentTaskId !== undefined && data.parentTaskId !== null) {
      const parentTask = await prisma.task.findFirst({
        where: {
          id: data.parentTaskId,
          projectId: existingTask.projectId,
        },
      });

      if (!parentTask) {
        return NextResponse.json({ error: "Parent task not found" }, { status: 400 });
      }

      // Prevent circular references
      if (data.parentTaskId === taskId) {
        return NextResponse.json({ error: "Task cannot be its own parent" }, { status: 400 });
      }
    }

    // Validate sprint if being updated
    if (data.sprintId !== undefined && data.sprintId !== null) {
      const sprint = await prisma.sprint.findFirst({
        where: {
          id: data.sprintId,
          projectId: existingTask.projectId,
        },
      });

      if (!sprint) {
        return NextResponse.json({ error: "Sprint not found" }, { status: 400 });
      }
    }

    // Validate assignee if being updated
    if (data.assigneeId !== undefined && data.assigneeId !== null) {
      const isMember = await prisma.project.findFirst({
        where: {
          id: existingTask.projectId,
          OR: [
            { userId: data.assigneeId },
            { members: { some: { userId: data.assigneeId } } },
          ],
        },
      });

      if (!isMember) {
        return NextResponse.json({ error: "Assignee must be a project member" }, { status: 400 });
      }
    }

    // Handle label updates separately
    const { labelIds, ...updateData } = data;

    const task = await prisma.task.update({
      where: { id: existingTask.id },
      data: {
        ...updateData,
        dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
        ...(labelIds !== undefined && {
          labels: {
            set: labelIds.map((id) => ({ id })),
          },
        }),
      },
      include: {
        assignee: {
          select: { id: true, name: true, image: true },
        },
        sprint: {
          select: { id: true, name: true, status: true },
        },
        labels: true,
        parentTask: {
          select: { id: true, title: true, taskType: true },
        },
        _count: {
          select: { subtasks: true },
        },
      },
    });

    // Notify watchers if status changed
    if (data.status && data.status !== existingTask.status) {
      const updaterName = session.user.name || "Someone";
      await notifyWatchersTaskUpdated(
        existingTask.id,
        existingTask.title,
        existingTask.project.name,
        updaterName,
        `changed status from ${existingTask.status} to ${data.status}`,
        session.user.id
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Build where clause based on identifier type (cuid or taskKey)
    const whereClause = isTaskKey(taskId)
      ? { taskKey: taskId }
      : { id: taskId };

    // Verify task access
    const existingTask = await prisma.task.findFirst({
      where: {
        ...whereClause,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } } } },
          ],
        },
      },
      include: {
        _count: { select: { subtasks: true } },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if task has subtasks
    if (existingTask._count.subtasks > 0) {
      return NextResponse.json(
        { error: "Cannot delete task with subtasks. Delete subtasks first." },
        { status: 400 }
      );
    }

    await prisma.task.delete({
      where: { id: existingTask.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
