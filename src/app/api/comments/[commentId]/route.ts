import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ commentId: string }>;
}

// Update a comment
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { commentId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Find the comment and verify ownership
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only the comment author can edit (and system comments can't be edited)
    if (comment.isSystem) {
      return NextResponse.json({ error: "System comments cannot be edited" }, { status: 403 });
    }

    if (comment.userId !== session.user.id) {
      return NextResponse.json({ error: "You can only edit your own comments" }, { status: 403 });
    }

    // Update the comment
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        reactions: {
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

// Delete a comment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { commentId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the comment and verify ownership
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // System comments can't be deleted by users
    if (comment.isSystem) {
      return NextResponse.json({ error: "System comments cannot be deleted" }, { status: 403 });
    }

    // Only the comment author or project owner can delete
    const isOwner = comment.userId === session.user.id;
    const isProjectOwner = comment.task.project.userId === session.user.id;

    if (!isOwner && !isProjectOwner) {
      return NextResponse.json({ error: "You cannot delete this comment" }, { status: 403 });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
