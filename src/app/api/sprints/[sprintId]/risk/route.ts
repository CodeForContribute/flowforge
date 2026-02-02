import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { assessSprintRisk } from "@/services/ai";

const riskRequestSchema = z.object({
  includeCodebaseAnalysis: z.boolean().optional().default(false),
});

interface RouteParams {
  params: Promise<{ sprintId: string }>;
}

/**
 * POST /api/sprints/[sprintId]/risk
 * Generate an AI-powered risk assessment for the sprint
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sprintId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const data = riskRequestSchema.parse(body);

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
        name: true,
        status: true,
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Generate risk assessment
    const assessment = await assessSprintRisk({
      sprintId,
      includeCodebaseAnalysis: data.includeCodebaseAnalysis,
    });

    return NextResponse.json({
      assessment,
      sprint: {
        id: sprint.id,
        name: sprint.name,
        status: sprint.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    console.error("Error generating risk assessment:", error);
    const message = error instanceof Error ? error.message : "Failed to generate risk assessment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/sprints/[sprintId]/risk
 * Get quick risk overview without full AI analysis
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
        project: { select: { id: true } },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            storyPoints: true,
            dueDate: true,
            assigneeId: true,
          },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Calculate quick risk indicators
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((sprint.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    const completedStatuses = ["MERGED", "CLOSED", "APPROVED"];
    const notStartedStatuses = ["BACKLOG", "TODO"];

    const totalTasks = sprint.tasks.length;
    const completedTasks = sprint.tasks.filter((t) =>
      completedStatuses.includes(t.status)
    ).length;
    const notStartedTasks = sprint.tasks.filter((t) =>
      notStartedStatuses.includes(t.status)
    ).length;
    const unassignedTasks = sprint.tasks.filter((t) => !t.assigneeId).length;
    const noEstimateTasks = sprint.tasks.filter((t) => !t.storyPoints).length;
    const overdueTasks = sprint.tasks.filter(
      (t) => t.dueDate && t.dueDate < now && !completedStatuses.includes(t.status)
    ).length;

    // Quick risk score calculation
    let riskScore = 0;

    // Late in sprint with many tasks not started
    if (daysRemaining < 3 && notStartedTasks > 0) {
      riskScore += 30;
    } else if (daysRemaining < 7 && notStartedTasks > totalTasks * 0.3) {
      riskScore += 20;
    }

    // Unassigned tasks
    if (unassignedTasks > 0) {
      riskScore += Math.min(20, unassignedTasks * 5);
    }

    // No estimates
    if (noEstimateTasks > 0) {
      riskScore += Math.min(15, noEstimateTasks * 3);
    }

    // Overdue tasks
    if (overdueTasks > 0) {
      riskScore += Math.min(25, overdueTasks * 10);
    }

    // Progress risk
    const progressRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
    const expectedProgress = sprint.startDate < now
      ? Math.min(1, (now.getTime() - sprint.startDate.getTime()) /
          (sprint.endDate.getTime() - sprint.startDate.getTime()))
      : 0;

    if (progressRate < expectedProgress - 0.2) {
      riskScore += 15;
    }

    return NextResponse.json({
      sprint: {
        id: sprint.id,
        name: sprint.name,
        status: sprint.status,
        daysRemaining,
      },
      quickRisk: {
        score: Math.min(100, riskScore),
        level: riskScore <= 25 ? "low" : riskScore <= 50 ? "medium" : riskScore <= 75 ? "high" : "critical",
        indicators: {
          totalTasks,
          completedTasks,
          notStartedTasks,
          unassignedTasks,
          noEstimateTasks,
          overdueTasks,
          progressRate: Math.round(progressRate * 100),
          expectedProgress: Math.round(expectedProgress * 100),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching quick risk:", error);
    return NextResponse.json({ error: "Failed to fetch risk overview" }, { status: 500 });
  }
}
