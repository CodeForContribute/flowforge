import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  generateSprintPlan,
  applySprintPlan,
  type TeamMemberCapacity,
} from "@/services/ai";

const generatePlanSchema = z.object({
  backlogTaskIds: z.array(z.string()).optional(),
  teamCapacity: z
    .array(
      z.object({
        userId: z.string(),
        name: z.string(),
        availableHours: z.number().min(0).max(168),
        skills: z.array(z.string()).optional(),
      })
    )
    .optional(),
  sprintGoal: z.string().max(500).optional(),
  maxStoryPoints: z.number().min(1).max(1000).optional(),
});

const applyPlanSchema = z.object({
  taskAssignments: z.array(
    z.object({
      taskId: z.string(),
      assigneeId: z.string().nullable().optional(),
    })
  ),
});

interface RouteParams {
  params: Promise<{ sprintId: string }>;
}

/**
 * POST /api/sprints/[sprintId]/plan
 * Generate an AI-powered sprint plan suggestion
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sprintId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = generatePlanSchema.parse(body);

    // Verify sprint access and get project ID
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
          select: { id: true },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Validate sprint is in planning status
    if (sprint.status !== "PLANNING") {
      return NextResponse.json(
        { error: "Sprint must be in PLANNING status to generate AI plan" },
        { status: 400 }
      );
    }

    // Build team capacity from provided data or fetch from project members
    let teamCapacity: TeamMemberCapacity[] = data.teamCapacity || [];

    if (teamCapacity.length === 0) {
      // Fetch project members as default capacity
      const project = await prisma.project.findUnique({
        where: { id: sprint.project.id },
        include: {
          user: { select: { id: true, name: true } },
          members: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (project) {
        teamCapacity = [
          {
            userId: project.user.id,
            name: project.user.name || "Project Owner",
            availableHours: 40, // Default to full-time
          },
          ...project.members.map((m) => ({
            userId: m.user.id,
            name: m.user.name || "Team Member",
            availableHours: 40,
          })),
        ];
      }
    }

    // Generate the sprint plan
    const plan = await generateSprintPlan(sprint.project.id, {
      sprintId,
      backlogTaskIds: data.backlogTaskIds,
      teamCapacity,
      sprintGoal: data.sprintGoal,
      maxStoryPoints: data.maxStoryPoints,
    });

    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    console.error("Error generating sprint plan:", error);
    const message = error instanceof Error ? error.message : "Failed to generate sprint plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/sprints/[sprintId]/plan
 * Apply an AI-generated sprint plan
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { sprintId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = applyPlanSchema.parse(body);

    // Verify sprint access with edit permissions
    const sprint = await prisma.sprint.findFirst({
      where: {
        id: sprintId,
        project: {
          OR: [
            { userId: session.user.id },
            {
              members: {
                some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } },
              },
            },
          ],
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Apply the plan
    const result = await applySprintPlan(sprintId, data.taskAssignments);

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    console.error("Error applying sprint plan:", error);
    const message = error instanceof Error ? error.message : "Failed to apply sprint plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
