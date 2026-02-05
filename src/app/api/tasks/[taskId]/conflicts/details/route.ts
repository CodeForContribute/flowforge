import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConflictDetails } from "@/services/github";

interface RouteContext {
  params: Promise<{ taskId: string }>;
}

// GET - Get detailed conflict information including file contents
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await context.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            user: { select: { accessToken: true } },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!task.prNumber) {
      return NextResponse.json({ error: "Task has no PR" }, { status: 400 });
    }

    const [owner, repo] = task.project.githubRepo.split("/");
    const accessToken = task.project.user?.accessToken;

    if (!accessToken) {
      return NextResponse.json({ error: "No access token available for this project" }, { status: 400 });
    }

    // Get detailed conflict information including file contents
    const conflictDetails = await getConflictDetails(
      accessToken,
      owner,
      repo,
      task.prNumber
    );

    return NextResponse.json(conflictDetails);
  } catch (error) {
    console.error("Error fetching conflict details:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch conflict details" },
      { status: 500 }
    );
  }
}
