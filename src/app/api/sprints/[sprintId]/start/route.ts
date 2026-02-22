import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
        project: true,
      },
    });

    if (!existingSprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    if (existingSprint.status !== "PLANNING") {
      return NextResponse.json(
        { error: "Only sprints in PLANNING status can be started" },
        { status: 400 }
      );
    }

    // Check if there's already an active sprint in the project
    const activeSprint = await prisma.sprint.findFirst({
      where: {
        projectId: existingSprint.projectId,
        status: "ACTIVE",
        id: { not: sprintId },
      },
    });

    if (activeSprint) {
      return NextResponse.json(
        { error: "There is already an active sprint in this project. Complete it first." },
        { status: 400 }
      );
    }

    const [sprint] = await prisma.$transaction([
      prisma.sprint.update({
        where: { id: sprintId },
        data: { status: "ACTIVE" },
      }),
      prisma.task.updateMany({
        where: {
          sprintId: sprintId,
          status: "BACKLOG",
        },
        data: { status: "TODO" },
      }),
    ]);

    return NextResponse.json({ sprint });
  } catch (error) {
    console.error("Error starting sprint:", error);
    return NextResponse.json({ error: "Failed to start sprint" }, { status: 500 });
  }
}
