import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSprintSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  goal: z.string().max(500).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED"]).optional(),
});

interface RouteParams {
  params: Promise<{ sprintId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sprintId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sprint = await prisma.sprint.findFirst({
      where: {
        id: sprintId,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
      },
      include: {
        project: {
          select: { id: true, name: true, githubRepo: true },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, image: true },
            },
            labels: true,
            _count: {
              select: { comments: true, subtasks: true },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Calculate statistics
    const totalTasks = sprint.tasks.length;
    const completedTasks = sprint.tasks.filter(
      (t) => t.status === "MERGED" || t.status === "CLOSED"
    ).length;
    const totalPoints = sprint.tasks.reduce(
      (sum, t) => sum + (t.storyPoints || 0),
      0
    );
    const completedPoints = sprint.tasks
      .filter((t) => t.status === "MERGED" || t.status === "CLOSED")
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    return NextResponse.json({
      sprint: {
        ...sprint,
        stats: {
          totalTasks,
          completedTasks,
          totalPoints,
          completedPoints,
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching sprint:", error);
    return NextResponse.json({ error: "Failed to fetch sprint" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { sprintId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateSprintSchema.parse(body);

    // Verify sprint access
    const existingSprint = await prisma.sprint.findFirst({
      where: {
        id: sprintId,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } } } },
          ],
        },
      },
    });

    if (!existingSprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Validate dates if provided
    const startDate = data.startDate ? new Date(data.startDate) : existingSprint.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : existingSprint.endDate;

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    const sprint = await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        name: data.name,
        goal: data.goal,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        status: data.status,
      },
    });

    return NextResponse.json({ sprint });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating sprint:", error);
    return NextResponse.json({ error: "Failed to update sprint" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { sprintId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify sprint access
    const existingSprint = await prisma.sprint.findFirst({
      where: {
        id: sprintId,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } } } },
          ],
        },
      },
    });

    if (!existingSprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Unassign tasks from this sprint before deleting
    await prisma.task.updateMany({
      where: { sprintId },
      data: { sprintId: null },
    });

    await prisma.sprint.delete({
      where: { id: sprintId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sprint:", error);
    return NextResponse.json({ error: "Failed to delete sprint" }, { status: 500 });
  }
}
