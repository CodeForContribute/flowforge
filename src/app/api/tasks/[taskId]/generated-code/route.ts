import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTaskKey } from "@/lib/task-lookup";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

/**
 * GET /api/tasks/[taskId]/generated-code
 * Fetch the latest pending generated code for review
 */
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

    // Verify task ownership
    const task = await prisma.task.findFirst({
      where: {
        ...whereClause,
        project: {
          userId: session.user.id,
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get the latest pending generated code
    const generatedCode = await prisma.generatedCode.findFirst({
      where: {
        taskId: task.id,
        status: "PENDING_REVIEW",
      },
      orderBy: { version: "desc" },
    });

    if (!generatedCode) {
      return NextResponse.json(
        { error: "No pending generated code found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: generatedCode.id,
      files: generatedCode.files,
      summary: generatedCode.summary,
      version: generatedCode.version,
      status: generatedCode.status,
      userFeedback: generatedCode.userFeedback,
      createdAt: generatedCode.createdAt,
    });
  } catch (error) {
    console.error("Error fetching generated code:", error);
    return NextResponse.json(
      { error: "Failed to fetch generated code" },
      { status: 500 }
    );
  }
}
