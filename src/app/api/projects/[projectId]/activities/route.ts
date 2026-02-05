import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProjectKey } from "@/lib/task-lookup";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET - Get activity stream for a project
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const cursor = searchParams.get("cursor");
  const taskId = searchParams.get("taskId");

  try {
    const whereClause = isProjectKey(projectId)
      ? { projectKey: projectId }
      : { id: projectId };

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        ...whereClause,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const activities = await prisma.activity.findMany({
      where: {
        projectId: project.id,
        ...(taskId && { taskId }),
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        task: {
          select: { id: true, title: true, taskKey: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = activities.length > limit;
    const items = hasMore ? activities.slice(0, -1) : activities;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      activities: items,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}
