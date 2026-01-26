import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

// GET - Check if user is watching the task
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
        watchers: {
          where: { id: session.user.id },
          select: { id: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      isWatching: task.watchers.length > 0,
    });
  } catch (error) {
    console.error("Error checking watch status:", error);
    return NextResponse.json({ error: "Failed to check watch status" }, { status: 500 });
  }
}

// POST - Start watching the task
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify user has access to the task
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
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Add user to watchers
    await prisma.task.update({
      where: { id: taskId },
      data: {
        watchers: {
          connect: { id: session.user.id },
        },
      },
    });

    return NextResponse.json({ isWatching: true });
  } catch (error) {
    console.error("Error watching task:", error);
    return NextResponse.json({ error: "Failed to watch task" }, { status: 500 });
  }
}

// DELETE - Stop watching the task
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify user has access to the task
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
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Remove user from watchers
    await prisma.task.update({
      where: { id: taskId },
      data: {
        watchers: {
          disconnect: { id: session.user.id },
        },
      },
    });

    return NextResponse.json({ isWatching: false });
  } catch (error) {
    console.error("Error unwatching task:", error);
    return NextResponse.json({ error: "Failed to unwatch task" }, { status: 500 });
  }
}
