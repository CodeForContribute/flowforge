import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/tasks/[taskId]/time-logs/[logId] - Delete a time log
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; logId: string }> }
) {
  const { taskId, logId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify time log exists and user owns it or is admin
    const timeLog = await prisma.timeLog.findFirst({
      where: {
        id: logId,
        taskId,
        task: {
          project: {
            OR: [
              { userId: session.user.id },
              { members: { some: { userId: session.user.id } } },
            ],
          },
        },
      },
      include: {
        task: {
          select: {
            id: true,
            originalEstimate: true,
            project: {
              select: {
                userId: true,
                members: {
                  where: { userId: session.user.id },
                  select: { role: true },
                },
              },
            },
          },
        },
      },
    });

    if (!timeLog) {
      return NextResponse.json({ error: "Time log not found" }, { status: 404 });
    }

    // Check if user can delete (owner of log, project owner, or admin)
    const isLogOwner = timeLog.userId === session.user.id;
    const isProjectOwner = timeLog.task.project.userId === session.user.id;
    // members is already filtered by current user in the query, so if any exist, check their role
    const isProjectMemberAdmin = timeLog.task.project.members.some((m) => m.role === "ADMIN" || m.role === "OWNER");
    // TODO: For org projects, also check org membership roles

    if (!isLogOwner && !isProjectOwner && !isProjectMemberAdmin) {
      return NextResponse.json({ error: "Not authorized to delete this time log" }, { status: 403 });
    }

    // Delete the time log
    await prisma.timeLog.delete({
      where: { id: logId },
    });

    // Update time remaining if original estimate exists
    if (timeLog.task.originalEstimate) {
      const remainingLogs = await prisma.timeLog.findMany({
        where: { taskId },
        select: { timeSpent: true },
      });
      const totalSpent = remainingLogs.reduce((sum, log) => sum + log.timeSpent, 0);
      const newRemaining = Math.max(0, timeLog.task.originalEstimate - totalSpent);

      await prisma.task.update({
        where: { id: taskId },
        data: { timeRemaining: newRemaining },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting time log:", error);
    return NextResponse.json({ error: "Failed to delete time log" }, { status: 500 });
  }
}
