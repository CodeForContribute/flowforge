import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const createTaskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS"]).default("BACKLOG"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  taskType: z.enum(["EPIC", "STORY", "TASK", "SUBTASK", "BUG"]).default("TASK"),
  storyPoints: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().optional(),
  sprintId: z.string().optional(),
  parentTaskId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const assigneeId = searchParams.get("assignee");
    const sprintId = searchParams.get("sprint");
    const labelIds = searchParams.get("labels")?.split(",").filter(Boolean);
    const taskType = searchParams.get("type");
    const parentTaskId = searchParams.get("parent");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");
    const dueBefore = searchParams.get("dueBefore");
    const dueAfter = searchParams.get("dueAfter");
    const overdue = searchParams.get("overdue");
    const noSprint = searchParams.get("noSprint");

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Build filter conditions
    const where: Prisma.TaskWhereInput = {
      projectId,
      ...(assigneeId && { assigneeId }),
      ...(sprintId && { sprintId }),
      ...(noSprint === "true" && { sprintId: null }),
      ...(taskType && { taskType: taskType as "EPIC" | "STORY" | "TASK" | "SUBTASK" | "BUG" }),
      ...(parentTaskId && { parentTaskId }),
      ...(parentTaskId === "null" && { parentTaskId: null }),
      ...(status && { status: status as Prisma.EnumTaskStatusFilter["equals"] }),
      ...(priority && { priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT" }),
      ...(labelIds && labelIds.length > 0 && {
        labels: { some: { id: { in: labelIds } } },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(dueBefore && { dueDate: { lte: new Date(dueBefore) } }),
      ...(dueAfter && { dueDate: { gte: new Date(dueAfter) } }),
      ...(overdue === "true" && {
        dueDate: { lt: new Date() },
        status: { notIn: ["MERGED", "CLOSED"] },
      }),
    };

    const tasks = await prisma.task.findMany({
      where,
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
          select: { comments: true, subtasks: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createTaskSchema.parse(body);

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: data.projectId,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Validate parent task if provided
    if (data.parentTaskId) {
      const parentTask = await prisma.task.findFirst({
        where: {
          id: data.parentTaskId,
          projectId: data.projectId,
        },
      });

      if (!parentTask) {
        return NextResponse.json({ error: "Parent task not found" }, { status: 400 });
      }

      // Validate hierarchy: EPIC -> STORY -> TASK -> SUBTASK
      const validHierarchy: Record<string, string[]> = {
        EPIC: [],
        STORY: ["EPIC"],
        TASK: ["STORY", "EPIC"],
        SUBTASK: ["TASK", "STORY"],
        BUG: ["EPIC", "STORY"],
      };

      if (!validHierarchy[data.taskType]?.includes(parentTask.taskType)) {
        return NextResponse.json(
          { error: `${data.taskType} cannot be a child of ${parentTask.taskType}` },
          { status: 400 }
        );
      }
    }

    // Validate sprint if provided
    if (data.sprintId) {
      const sprint = await prisma.sprint.findFirst({
        where: {
          id: data.sprintId,
          projectId: data.projectId,
        },
      });

      if (!sprint) {
        return NextResponse.json({ error: "Sprint not found" }, { status: 400 });
      }
    }

    // Validate assignee if provided
    if (data.assigneeId) {
      const isMember = await prisma.project.findFirst({
        where: {
          id: data.projectId,
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

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        taskType: data.taskType,
        storyPoints: data.storyPoints,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        projectId: data.projectId,
        assigneeId: data.assigneeId,
        sprintId: data.sprintId,
        parentTaskId: data.parentTaskId,
        ...(data.labelIds && data.labelIds.length > 0 && {
          labels: { connect: data.labelIds.map((id) => ({ id })) },
        }),
      },
      include: {
        assignee: {
          select: { id: true, name: true, image: true },
        },
        labels: true,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
