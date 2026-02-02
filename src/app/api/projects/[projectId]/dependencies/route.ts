import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { detectDependencies } from "@/services/ai";

const dependencyRequestSchema = z.object({
  taskIds: z.array(z.string()).optional(),
  sprintId: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * POST /api/projects/[projectId]/dependencies
 * Detect dependencies between tasks using AI
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const data = dependencyRequestSchema.parse(body);

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Detect dependencies
    const result = await detectDependencies({
      projectId,
      taskIds: data.taskIds,
      sprintId: data.sprintId,
    });

    return NextResponse.json({
      dependencies: result.dependencies,
      graph: result.graph,
      warnings: result.warnings,
      suggestions: result.suggestions,
      project: { id: project.id, name: project.name },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    console.error("Error detecting dependencies:", error);
    const message = error instanceof Error ? error.message : "Failed to detect dependencies";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/projects/[projectId]/dependencies
 * Get basic task relationship information (without AI)
 */
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
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get tasks with parent-child relationships
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        status: {
          in: [
            "BACKLOG",
            "TODO",
            "IN_PROGRESS",
            "GENERATING",
            "PR_OPEN",
            "IN_REVIEW",
            "CHANGES_REQUESTED",
          ],
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        taskType: true,
        storyPoints: true,
        parentTaskId: true,
        sprintId: true,
      },
    });

    // Build basic relationship graph from parent-child structure
    const nodes = tasks.map((t) => ({
      taskId: t.id,
      title: t.title,
      status: t.status,
      taskType: t.taskType,
      storyPoints: t.storyPoints,
      parentTaskId: t.parentTaskId,
      sprintId: t.sprintId,
    }));

    // Parent-child edges (natural dependencies)
    const edges = tasks
      .filter((t) => t.parentTaskId)
      .map((t) => ({
        fromTaskId: t.parentTaskId!,
        toTaskId: t.id,
        type: "parent_child" as const,
      }));

    return NextResponse.json({
      project: { id: project.id, name: project.name },
      nodes,
      edges,
      taskCount: tasks.length,
    });
  } catch (error) {
    console.error("Error fetching dependencies:", error);
    return NextResponse.json({ error: "Failed to fetch dependencies" }, { status: 500 });
  }
}
