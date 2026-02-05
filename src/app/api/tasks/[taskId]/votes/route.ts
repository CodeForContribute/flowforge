import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTaskKey } from "@/lib/task-lookup";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

// GET - Get vote count and user's vote status
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const whereClause = isTaskKey(taskId)
      ? { taskKey: taskId }
      : { id: taskId };

    const task = await prisma.task.findFirst({
      where: {
        ...whereClause,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
      },
      select: {
        id: true,
        _count: { select: { votes: true } },
        votes: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      voteCount: task._count.votes,
      hasVoted: task.votes.length > 0,
    });
  } catch (error) {
    console.error("Error fetching votes:", error);
    return NextResponse.json({ error: "Failed to fetch votes" }, { status: 500 });
  }
}

// POST - Add a vote
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const whereClause = isTaskKey(taskId)
      ? { taskKey: taskId }
      : { id: taskId };

    const task = await prisma.task.findFirst({
      where: {
        ...whereClause,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
      },
      select: { id: true, projectId: true, title: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if already voted
    const existingVote = await prisma.taskVote.findUnique({
      where: {
        taskId_userId: {
          taskId: task.id,
          userId: session.user.id,
        },
      },
    });

    if (existingVote) {
      return NextResponse.json({ error: "Already voted" }, { status: 400 });
    }

    // Create vote and activity
    const [vote] = await prisma.$transaction([
      prisma.taskVote.create({
        data: {
          taskId: task.id,
          userId: session.user.id,
        },
      }),
      prisma.activity.create({
        data: {
          type: "VOTE_ADDED",
          description: `voted for "${task.title}"`,
          projectId: task.projectId,
          taskId: task.id,
          userId: session.user.id,
        },
      }),
    ]);

    const voteCount = await prisma.taskVote.count({
      where: { taskId: task.id },
    });

    return NextResponse.json({
      vote,
      voteCount,
      hasVoted: true,
    });
  } catch (error) {
    console.error("Error adding vote:", error);
    return NextResponse.json({ error: "Failed to add vote" }, { status: 500 });
  }
}

// DELETE - Remove a vote
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const whereClause = isTaskKey(taskId)
      ? { taskKey: taskId }
      : { id: taskId };

    const task = await prisma.task.findFirst({
      where: {
        ...whereClause,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
      },
      select: { id: true, projectId: true, title: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Delete vote and create activity
    await prisma.$transaction([
      prisma.taskVote.delete({
        where: {
          taskId_userId: {
            taskId: task.id,
            userId: session.user.id,
          },
        },
      }),
      prisma.activity.create({
        data: {
          type: "VOTE_REMOVED",
          description: `removed vote from "${task.title}"`,
          projectId: task.projectId,
          taskId: task.id,
          userId: session.user.id,
        },
      }),
    ]);

    const voteCount = await prisma.taskVote.count({
      where: { taskId: task.id },
    });

    return NextResponse.json({
      voteCount,
      hasVoted: false,
    });
  } catch (error) {
    console.error("Error removing vote:", error);
    return NextResponse.json({ error: "Failed to remove vote" }, { status: 500 });
  }
}
