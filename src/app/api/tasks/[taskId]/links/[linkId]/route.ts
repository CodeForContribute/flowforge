import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ taskId: string; linkId: string }>;
}

// DELETE - Remove a task link
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, linkId } = await context.params;

    // Get the link to verify it exists and involves this task
    const link = await prisma.taskLink.findUnique({
      where: { id: linkId },
      include: {
        sourceTask: {
          include: { project: true },
        },
      },
    });

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // Verify the link involves the specified task
    if (link.sourceTaskId !== taskId && link.targetTaskId !== taskId) {
      return NextResponse.json(
        { error: "Link does not belong to this task" },
        { status: 400 }
      );
    }

    // Verify user has access to the project
    const hasAccess = await prisma.project.findFirst({
      where: {
        id: link.sourceTask.projectId,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Delete the link
    await prisma.taskLink.delete({
      where: { id: linkId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task link:", error);
    return NextResponse.json(
      { error: "Failed to delete task link" },
      { status: 500 }
    );
  }
}
