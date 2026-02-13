import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTimeLogSchema = z.object({
  timeSpent: z.number().min(1).max(1440), // 1 minute to 24 hours
  date: z.string().optional(), // ISO date string
  description: z.string().max(1000).optional(),
});

// GET /api/tasks/[taskId]/time-logs - List time logs for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify task exists and user has access
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
        originalEstimate: true,
        timeRemaining: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Fetch time logs
    const timeLogs = await prisma.timeLog.findMany({
      where: { taskId },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { date: "desc" },
    });

    // Calculate total time spent
    const totalTimeSpent = timeLogs.reduce((sum, log) => sum + log.timeSpent, 0);

    return NextResponse.json({
      timeLogs,
      totalTimeSpent,
      originalEstimate: task.originalEstimate,
      timeRemaining: task.timeRemaining ?? (task.originalEstimate ? task.originalEstimate - totalTimeSpent : null),
    });
  } catch (error) {
    console.error("Error fetching time logs:", error);
    return NextResponse.json({ error: "Failed to fetch time logs" }, { status: 500 });
  }
}

// POST /api/tasks/[taskId]/time-logs - Create a new time log
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { timeSpent, date, description } = createTimeLogSchema.parse(body);

    // Verify task exists and user has access
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
        originalEstimate: true,
        timeRemaining: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Create time log
    const timeLog = await prisma.timeLog.create({
      data: {
        timeSpent,
        date: date ? new Date(date) : new Date(),
        description: description || null,
        taskId,
        userId: session.user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Update time remaining if original estimate exists
    if (task.originalEstimate) {
      const allLogs = await prisma.timeLog.findMany({
        where: { taskId },
        select: { timeSpent: true },
      });
      const totalSpent = allLogs.reduce((sum, log) => sum + log.timeSpent, 0);
      const newRemaining = Math.max(0, task.originalEstimate - totalSpent);

      await prisma.task.update({
        where: { id: taskId },
        data: { timeRemaining: newRemaining },
      });
    }

    return NextResponse.json(timeLog, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Error creating time log:", error);
    return NextResponse.json({ error: "Failed to create time log" }, { status: 500 });
  }
}
