import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateItemSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  completed: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ sprintId: string; itemId: string }>;
}

/**
 * PATCH /api/sprints/[sprintId]/retro/items/[itemId]
 * Update a retro item
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { sprintId, itemId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateItemSchema.parse(body);

    // Verify item exists and user has access
    const existingItem = await prisma.sprintRetroItem.findFirst({
      where: {
        id: itemId,
        sprintId,
        sprint: {
          project: {
            OR: [
              { userId: session.user.id },
              { members: { some: { userId: session.user.id } } },
            ],
          },
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Only author can edit content
    if (data.content && existingItem.authorId !== session.user.id) {
      return NextResponse.json({ error: "Only the author can edit this item" }, { status: 403 });
    }

    const item = await prisma.sprintRetroItem.update({
      where: { id: itemId },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.completed !== undefined && { completed: data.completed }),
      },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Error updating retro item:", error);
    return NextResponse.json({ error: "Failed to update retro item" }, { status: 500 });
  }
}

/**
 * DELETE /api/sprints/[sprintId]/retro/items/[itemId]
 * Delete a retro item
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { sprintId, itemId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify item exists and user is the author
    const existingItem = await prisma.sprintRetroItem.findFirst({
      where: {
        id: itemId,
        sprintId,
        sprint: {
          project: {
            OR: [
              { userId: session.user.id },
              { members: { some: { userId: session.user.id } } },
            ],
          },
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Only author can delete
    if (existingItem.authorId !== session.user.id) {
      return NextResponse.json({ error: "Only the author can delete this item" }, { status: 403 });
    }

    await prisma.sprintRetroItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting retro item:", error);
    return NextResponse.json({ error: "Failed to delete retro item" }, { status: 500 });
  }
}

/**
 * POST /api/sprints/[sprintId]/retro/items/[itemId]
 * Vote on a retro item (increment/decrement)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sprintId, itemId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = body.action as "upvote" | "downvote";

    if (!["upvote", "downvote"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Verify item exists and user has access
    const existingItem = await prisma.sprintRetroItem.findFirst({
      where: {
        id: itemId,
        sprintId,
        sprint: {
          project: {
            OR: [
              { userId: session.user.id },
              { members: { some: { userId: session.user.id } } },
            ],
          },
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const item = await prisma.sprintRetroItem.update({
      where: { id: itemId },
      data: {
        votes: {
          increment: action === "upvote" ? 1 : -1,
        },
      },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error voting on retro item:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
