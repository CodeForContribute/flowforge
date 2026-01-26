import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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

    // Verify task ownership
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          userId: session.user.id,
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        taskId,
        userId: session.user.id,
        isSystem: false,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
