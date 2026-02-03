import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseMentions, notifyMention, notifyWatchersCommentAdded } from "@/services/notifications";
import { isTaskKey } from "@/lib/task-lookup";

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createCommentSchema.parse(body);

    // Build where clause based on identifier type (cuid or taskKey)
    const whereClause = isTaskKey(taskId)
      ? { taskKey: taskId }
      : { id: taskId };

    // Get task with project info
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
      include: {
        project: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Parse @mentions from content
    const mentionedUsers = await parseMentions(data.content, task.projectId);
    const mentionedUserIds = mentionedUsers.map((u) => u.userId);

    // Create comment with mentions
    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        taskId: task.id,
        userId: session.user.id,
        isSystem: false,
        mentions: mentionedUserIds,
      },
      include: {
        user: true,
      },
    });

    // Send notifications to mentioned users (except the commenter)
    const commenterName = session.user.name || "Someone";
    for (const mentioned of mentionedUsers) {
      if (mentioned.userId !== session.user.id) {
        await notifyMention(
          mentioned.userId,
          commenterName,
          task.id,
          task.title,
          task.project.name,
          data.content
        );
      }
    }

    // Notify watchers (exclude commenter and already-notified mentioned users)
    const excludeFromWatcherNotification = [session.user.id, ...mentionedUserIds];
    await notifyWatchersCommentAdded(
      task.id,
      task.title,
      task.project.name,
      commenterName,
      data.content,
      excludeFromWatcherNotification
    );

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
