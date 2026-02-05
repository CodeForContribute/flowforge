import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createItemSchema = z.object({
  content: z.string().min(1).max(1000),
  type: z.enum(["WENT_WELL", "TO_IMPROVE", "ACTION_ITEM"]),
});

interface RouteParams {
  params: Promise<{ sprintId: string }>;
}

/**
 * GET /api/sprints/[sprintId]/retro/items
 * Get all retro items for a sprint
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sprintId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify sprint access
    const sprint = await prisma.sprint.findFirst({
      where: {
        id: sprintId,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
      },
      include: {
        retroItems: {
          include: {
            author: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: [
            { votes: "desc" },
            { createdAt: "asc" },
          ],
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Group items by type
    const wentWell = sprint.retroItems.filter((item) => item.type === "WENT_WELL");
    const toImprove = sprint.retroItems.filter((item) => item.type === "TO_IMPROVE");
    const actionItems = sprint.retroItems.filter((item) => item.type === "ACTION_ITEM");

    return NextResponse.json({
      wentWell,
      toImprove,
      actionItems,
      total: sprint.retroItems.length,
    });
  } catch (error) {
    console.error("Error fetching retro items:", error);
    return NextResponse.json({ error: "Failed to fetch retro items" }, { status: 500 });
  }
}

/**
 * POST /api/sprints/[sprintId]/retro/items
 * Create a new retro item
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sprintId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createItemSchema.parse(body);

    // Verify sprint access
    const sprint = await prisma.sprint.findFirst({
      where: {
        id: sprintId,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Create the retro item
    const item = await prisma.sprintRetroItem.create({
      data: {
        content: data.content,
        type: data.type,
        sprintId,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Error creating retro item:", error);
    return NextResponse.json({ error: "Failed to create retro item" }, { status: 500 });
  }
}
