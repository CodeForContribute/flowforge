import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateRetrospective, compareSprintRetros } from "@/services/ai";

const retroRequestSchema = z.object({
  includeComments: z.boolean().optional().default(true),
  includePRAnalysis: z.boolean().optional().default(false),
});

const compareRequestSchema = z.object({
  compareWithSprintId: z.string(),
});

interface RouteParams {
  params: Promise<{ sprintId: string }>;
}

/**
 * POST /api/sprints/[sprintId]/retro
 * Generate an AI-powered sprint retrospective
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sprintId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const data = retroRequestSchema.parse(body);

    // Verify sprint access
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
      select: {
        id: true,
        status: true,
        name: true,
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Generate the retrospective
    const retrospective = await generateRetrospective({
      sprintId,
      includeComments: data.includeComments,
      includePRAnalysis: data.includePRAnalysis,
    });

    return NextResponse.json({
      retrospective,
      sprintName: sprint.name,
      sprintStatus: sprint.status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    console.error("Error generating retrospective:", error);
    const message = error instanceof Error ? error.message : "Failed to generate retrospective";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/sprints/[sprintId]/retro
 * Get sprint metrics for retrospective (quick view without AI)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sprintId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify sprint access
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
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            storyPoints: true,
            assignee: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Calculate basic metrics
    const completedStatuses = ["MERGED", "CLOSED"];
    const totalTasks = sprint.tasks.length;
    const completedTasks = sprint.tasks.filter((t) =>
      completedStatuses.includes(t.status)
    ).length;
    const totalPoints = sprint.tasks.reduce(
      (sum, t) => sum + (t.storyPoints || 0),
      0
    );
    const completedPoints = sprint.tasks
      .filter((t) => completedStatuses.includes(t.status))
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    return NextResponse.json({
      sprint: {
        id: sprint.id,
        name: sprint.name,
        goal: sprint.goal,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      },
      metrics: {
        totalTasks,
        completedTasks,
        totalPoints,
        completedPoints,
        velocity: completedPoints,
        completionRate: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
      },
      tasks: sprint.tasks,
    });
  } catch (error) {
    console.error("Error fetching sprint metrics:", error);
    return NextResponse.json({ error: "Failed to fetch sprint metrics" }, { status: 500 });
  }
}

/**
 * PUT /api/sprints/[sprintId]/retro
 * Compare this sprint with another sprint
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { sprintId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = compareRequestSchema.parse(body);

    // Verify access to both sprints
    const [sprint1, sprint2] = await Promise.all([
      prisma.sprint.findFirst({
        where: {
          id: sprintId,
          project: {
            OR: [
              { userId: session.user.id },
              { members: { some: { userId: session.user.id } } },
            ],
          },
        },
      }),
      prisma.sprint.findFirst({
        where: {
          id: data.compareWithSprintId,
          project: {
            OR: [
              { userId: session.user.id },
              { members: { some: { userId: session.user.id } } },
            ],
          },
        },
      }),
    ]);

    if (!sprint1 || !sprint2) {
      return NextResponse.json({ error: "One or both sprints not found" }, { status: 404 });
    }

    // Compare the sprints
    const comparison = await compareSprintRetros(sprintId, data.compareWithSprintId);

    return NextResponse.json({
      comparison,
      sprint1: { id: sprint1.id, name: sprint1.name },
      sprint2: { id: sprint2.id, name: sprint2.name },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    console.error("Error comparing sprints:", error);
    const message = error instanceof Error ? error.message : "Failed to compare sprints";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
