import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateImplementationPrompt } from "@/services/prompt-generator";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get task with project, parent task, and sprint info
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
      include: {
        project: true,
        parentTask: {
          select: {
            title: true,
            description: true,
            taskType: true,
          },
        },
        sprint: {
          select: {
            name: true,
            goal: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Generate the prompt with hierarchy and sprint context
    const prompt = await generateImplementationPrompt({
      taskTitle: task.title,
      taskDescription: task.description,
      taskType: task.taskType,
      projectName: task.project.name,
      githubRepo: task.project.githubRepo,
      accessToken: session.user.accessToken,
      parentTask: task.parentTask,
      sprint: task.sprint,
    });

    // Save the prompt to the task
    await prisma.task.update({
      where: { id: taskId },
      data: { generatedPrompt: prompt },
    });

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error("Error generating prompt:", error);
    return NextResponse.json({ error: "Failed to generate prompt" }, { status: 500 });
  }
}
