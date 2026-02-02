import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { estimateTask, applyEstimation } from "@/services/ai";

const estimateRequestSchema = z.object({
  includeCodebaseAnalysis: z.boolean().optional().default(false),
});

const applyEstimateSchema = z.object({
  storyPoints: z.number().min(1).max(100),
});

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

/**
 * POST /api/tasks/[taskId]/estimate
 * Generate an AI-powered story point estimate for a task
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const data = estimateRequestSchema.parse(body);

    // Verify task access
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
      },
      select: {
        id: true,
        title: true,
        storyPoints: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Generate the estimate
    const estimation = await estimateTask({
      taskId,
      includeCodebaseAnalysis: data.includeCodebaseAnalysis,
    });

    return NextResponse.json({
      estimation,
      currentStoryPoints: task.storyPoints,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    console.error("Error generating task estimate:", error);
    const message = error instanceof Error ? error.message : "Failed to generate estimate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/tasks/[taskId]/estimate
 * Apply an AI-generated estimate to the task
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = applyEstimateSchema.parse(body);

    // Verify task access with edit permissions
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          OR: [
            { userId: session.user.id },
            {
              members: {
                some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN", "MEMBER"] } },
              },
            },
          ],
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Apply the estimate
    await applyEstimation(taskId, data.storyPoints);

    return NextResponse.json({
      success: true,
      storyPoints: data.storyPoints,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    console.error("Error applying task estimate:", error);
    const message = error instanceof Error ? error.message : "Failed to apply estimate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/tasks/[taskId]/estimate
 * Get the current estimation for a task (if previously generated)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify task access
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
      },
      select: {
        id: true,
        title: true,
        storyPoints: true,
        taskType: true,
        priority: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      taskId: task.id,
      title: task.title,
      currentStoryPoints: task.storyPoints,
      taskType: task.taskType,
      priority: task.priority,
    });
  } catch (error) {
    console.error("Error fetching task estimate:", error);
    return NextResponse.json({ error: "Failed to fetch estimate" }, { status: 500 });
  }
}
