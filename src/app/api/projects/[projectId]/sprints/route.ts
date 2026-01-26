import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSprintSchema = z.object({
  name: z.string().min(1).max(100),
  goal: z.string().max(500).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const sprints = await prisma.sprint.findMany({
      where: {
        projectId,
        ...(status && { status: status as "PLANNING" | "ACTIVE" | "COMPLETED" }),
      },
      include: {
        _count: {
          select: { tasks: true },
        },
        tasks: {
          select: {
            id: true,
            status: true,
            storyPoints: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    // Calculate sprint statistics
    const sprintsWithStats = sprints.map((sprint) => {
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

      return {
        ...sprint,
        stats: {
          totalTasks,
          completedTasks,
          totalPoints,
          completedPoints,
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
      };
    });

    return NextResponse.json({ sprints: sprintsWithStats });
  } catch (error) {
    console.error("Error fetching sprints:", error);
    return NextResponse.json({ error: "Failed to fetch sprints" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createSprintSchema.parse(body);

    // Verify project ownership or admin access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    const sprint = await prisma.sprint.create({
      data: {
        name: data.name,
        goal: data.goal,
        startDate,
        endDate,
        projectId,
      },
    });

    return NextResponse.json({ sprint }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating sprint:", error);
    return NextResponse.json({ error: "Failed to create sprint" }, { status: 500 });
  }
}
