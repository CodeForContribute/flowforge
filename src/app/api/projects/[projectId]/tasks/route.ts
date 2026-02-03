import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  // Verify the user has access to this project
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

  // Fetch tasks for the project
  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: {
      assignee: {
        select: { id: true, name: true, image: true },
      },
      labels: true,
      subtasks: {
        select: {
          id: true,
          title: true,
          status: true,
          taskKey: true,
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { comments: true, subtasks: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    tasks: tasks.map((task) => ({
      ...task,
      projectId,
    })),
  });
}
