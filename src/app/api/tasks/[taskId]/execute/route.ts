import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addTaskExecutionJob } from "@/lib/queue";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify task ownership and get current state
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          userId: session.user.id,
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!task.generatedPrompt) {
      return NextResponse.json(
        { error: "Task has no generated prompt. Generate a prompt first." },
        { status: 400 }
      );
    }

    // Check if task is in a valid state for execution
    const validStatuses = ["BACKLOG", "TODO", "IN_PROGRESS"];
    if (!validStatuses.includes(task.status)) {
      return NextResponse.json(
        { error: `Task cannot be executed in ${task.status} status` },
        { status: 400 }
      );
    }

    // Queue the execution job
    const jobId = await addTaskExecutionJob({
      taskId: task.id,
      userId: session.user.id,
    });

    // Update task status to indicate it's being processed
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "IN_PROGRESS" },
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: "Task execution started",
    });
  } catch (error) {
    console.error("Error starting task execution:", error);
    return NextResponse.json(
      { error: "Failed to start task execution" },
      { status: 500 }
    );
  }
}
