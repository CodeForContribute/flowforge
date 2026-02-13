import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface RouteContext {
  params: Promise<{ taskId: string }>;
}

const createLinkSchema = z.object({
  targetTaskId: z.string(),
  linkType: z.enum(["BLOCKS", "RELATES_TO", "DUPLICATES"]),
});

// GET - List all links for a task (both source and target)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await context.params;

    // Get task to verify access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify user has access to this project
    const hasAccess = await prisma.project.findFirst({
      where: {
        id: task.projectId,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get links where this task is the source
    const sourceLinks = await prisma.taskLink.findMany({
      where: { sourceTaskId: taskId },
      include: {
        targetTask: {
          select: {
            id: true,
            title: true,
            taskKey: true,
            status: true,
            taskType: true,
          },
        },
      },
    });

    // Get links where this task is the target
    const targetLinks = await prisma.taskLink.findMany({
      where: { targetTaskId: taskId },
      include: {
        sourceTask: {
          select: {
            id: true,
            title: true,
            taskKey: true,
            status: true,
            taskType: true,
          },
        },
      },
    });

    // Format the links with display info
    const formattedLinks = [
      ...sourceLinks.map((link) => ({
        id: link.id,
        linkType: link.linkType,
        direction: "outward" as const,
        displayType: getDisplayType(link.linkType, "outward"),
        linkedTask: link.targetTask,
        createdAt: link.createdAt,
      })),
      ...targetLinks.map((link) => ({
        id: link.id,
        linkType: link.linkType,
        direction: "inward" as const,
        displayType: getDisplayType(link.linkType, "inward"),
        linkedTask: link.sourceTask,
        createdAt: link.createdAt,
      })),
    ];

    return NextResponse.json({ links: formattedLinks });
  } catch (error) {
    console.error("Error fetching task links:", error);
    return NextResponse.json(
      { error: "Failed to fetch task links" },
      { status: 500 }
    );
  }
}

// POST - Create a new link
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await context.params;
    const body = await request.json();
    const data = createLinkSchema.parse(body);

    // Prevent self-linking
    if (taskId === data.targetTaskId) {
      return NextResponse.json(
        { error: "Cannot link a task to itself" },
        { status: 400 }
      );
    }

    // Get source task to verify access
    const sourceTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!sourceTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify user has access to this project
    const hasAccess = await prisma.project.findFirst({
      where: {
        id: sourceTask.projectId,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify target task exists and is in the same project
    const targetTask = await prisma.task.findUnique({
      where: { id: data.targetTaskId },
    });

    if (!targetTask) {
      return NextResponse.json(
        { error: "Target task not found" },
        { status: 404 }
      );
    }

    if (targetTask.projectId !== sourceTask.projectId) {
      return NextResponse.json(
        { error: "Cannot link tasks from different projects" },
        { status: 400 }
      );
    }

    // Check if link already exists
    const existingLink = await prisma.taskLink.findFirst({
      where: {
        OR: [
          {
            sourceTaskId: taskId,
            targetTaskId: data.targetTaskId,
            linkType: data.linkType,
          },
          // For RELATES_TO, check reverse direction too (bidirectional)
          ...(data.linkType === "RELATES_TO"
            ? [
                {
                  sourceTaskId: data.targetTaskId,
                  targetTaskId: taskId,
                  linkType: data.linkType,
                },
              ]
            : []),
        ],
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: "Link already exists" },
        { status: 400 }
      );
    }

    // Create the link
    const link = await prisma.taskLink.create({
      data: {
        sourceTaskId: taskId,
        targetTaskId: data.targetTaskId,
        linkType: data.linkType,
      },
      include: {
        targetTask: {
          select: {
            id: true,
            title: true,
            taskKey: true,
            status: true,
            taskType: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        link: {
          id: link.id,
          linkType: link.linkType,
          direction: "outward" as const,
          displayType: getDisplayType(link.linkType, "outward"),
          linkedTask: link.targetTask,
          createdAt: link.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }
    console.error("Error creating task link:", error);
    return NextResponse.json(
      { error: "Failed to create task link" },
      { status: 500 }
    );
  }
}

// Helper to get display type based on link type and direction
function getDisplayType(
  linkType: string,
  direction: "outward" | "inward"
): string {
  const displayTypes: Record<string, Record<string, string>> = {
    BLOCKS: {
      outward: "blocks",
      inward: "is blocked by",
    },
    RELATES_TO: {
      outward: "relates to",
      inward: "relates to",
    },
    DUPLICATES: {
      outward: "duplicates",
      inward: "is duplicated by",
    },
  };
  return displayTypes[linkType]?.[direction] || linkType.toLowerCase();
}
