import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ commentId: string }>;
}

// Add a reaction
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { commentId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emoji } = await request.json();

    if (!emoji || typeof emoji !== "string") {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
    }

    // Validate emoji is in allowed list
    const allowedEmojis = ["👍", "👎", "❤️", "🎉", "😄", "😕", "👀", "🚀"];
    if (!allowedEmojis.includes(emoji)) {
      return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
    }

    // Verify the comment exists and user has access
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

    // Check if user has access to this project
    // Personal project: user is owner or project member
    // Org project: user is org member or project member
    const isProjectOwner = comment.task.project.userId === session.user.id;
    const isProjectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: comment.task.projectId,
        userId: session.user.id,
      },
    });
    // TODO: For org projects, also check org membership
    const hasAccess = isProjectOwner || isProjectMember;

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if reaction already exists
    const existingReaction = await prisma.commentReaction.findUnique({
      where: {
        commentId_userId_emoji: {
          commentId,
          userId: session.user.id,
          emoji,
        },
      },
    });

    if (existingReaction) {
      // Remove the reaction (toggle)
      await prisma.commentReaction.delete({
        where: { id: existingReaction.id },
      });
      return NextResponse.json({ action: "removed", emoji });
    }

    // Add the reaction
    const reaction = await prisma.commentReaction.create({
      data: {
        commentId,
        userId: session.user.id,
        emoji,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({ action: "added", reaction });
  } catch (error) {
    console.error("Error adding reaction:", error);
    return NextResponse.json(
      { error: "Failed to add reaction" },
      { status: 500 }
    );
  }
}

// Get reactions for a comment
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { commentId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reactions = await prisma.commentReaction.findMany({
      where: { commentId },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Group reactions by emoji
    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
          hasReacted: false,
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].users.push(reaction.user);
      if (reaction.userId === session.user.id) {
        acc[reaction.emoji].hasReacted = true;
      }
      return acc;
    }, {} as Record<string, { emoji: string; count: number; users: typeof reactions[0]["user"][]; hasReacted: boolean }>);

    return NextResponse.json(Object.values(grouped));
  } catch (error) {
    console.error("Error getting reactions:", error);
    return NextResponse.json(
      { error: "Failed to get reactions" },
      { status: 500 }
    );
  }
}
