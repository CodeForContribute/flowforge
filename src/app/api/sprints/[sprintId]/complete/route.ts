import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const completeSprintSchema = z.object({
  moveIncompleteTo: z.enum(["backlog", "nextSprint"]).optional(),
  nextSprintId: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ sprintId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sprintId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { moveIncompleteTo, nextSprintId } = completeSprintSchema.parse(body);

    // Verify sprint access
    const existingSprint = await prisma.sprint.findFirst({
      where: {
        id: sprintId,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } } } },
          ],
        },
      },
      include: {
        tasks: {
          select: { id: true, status: true },
        },
      },
    });

    if (!existingSprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    if (existingSprint.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Only active sprints can be completed" },
        { status: 400 }
      );
    }

    // Find incomplete tasks
    const incompleteTasks = existingSprint.tasks.filter(
      (t) => !["MERGED", "CLOSED"].includes(t.status)
    );

    // Handle incomplete tasks
    if (incompleteTasks.length > 0) {
      if (moveIncompleteTo === "nextSprint" && nextSprintId) {
        // Verify next sprint exists and belongs to same project
        const nextSprint = await prisma.sprint.findFirst({
          where: {
            id: nextSprintId,
            projectId: existingSprint.projectId,
            status: "PLANNING",
          },
        });

        if (!nextSprint) {
          return NextResponse.json(
            { error: "Next sprint not found or not in PLANNING status" },
            { status: 400 }
          );
        }

        // Move tasks to next sprint
        await prisma.task.updateMany({
          where: {
            id: { in: incompleteTasks.map((t) => t.id) },
          },
          data: { sprintId: nextSprintId },
        });
      } else {
        // Move tasks to backlog (remove from sprint)
        await prisma.task.updateMany({
          where: {
            id: { in: incompleteTasks.map((t) => t.id) },
          },
          data: { sprintId: null },
        });
      }
    }

    const sprint = await prisma.sprint.update({
      where: { id: sprintId },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json({
      sprint,
      incompleteTasksMoved: incompleteTasks.length,
      movedTo: moveIncompleteTo || "backlog",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error completing sprint:", error);
    return NextResponse.json({ error: "Failed to complete sprint" }, { status: 500 });
  }
}
