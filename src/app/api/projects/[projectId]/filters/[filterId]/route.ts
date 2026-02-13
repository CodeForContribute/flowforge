import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateFilterSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  filters: z.object({
    status: z.array(z.string()).optional(),
    priority: z.array(z.string()).optional(),
    assigneeId: z.string().nullable().optional(),
    labelIds: z.array(z.string()).optional(),
    taskType: z.array(z.string()).optional(),
    sprintId: z.string().nullable().optional(),
    search: z.string().optional(),
  }).optional(),
  isShared: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ projectId: string; filterId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { projectId, filterId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const filter = await prisma.savedFilter.findFirst({
      where: {
        id: filterId,
        projectId,
        OR: [
          { userId: session.user.id },
          { isShared: true },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    if (!filter) {
      return NextResponse.json({ error: "Filter not found" }, { status: 404 });
    }

    return NextResponse.json({ filter });
  } catch (error) {
    console.error("Error fetching saved filter:", error);
    return NextResponse.json({ error: "Failed to fetch saved filter" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { projectId, filterId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if filter exists and belongs to the user
    const existingFilter = await prisma.savedFilter.findFirst({
      where: {
        id: filterId,
        projectId,
        userId: session.user.id, // Only owner can update
      },
    });

    if (!existingFilter) {
      return NextResponse.json({ error: "Filter not found or access denied" }, { status: 404 });
    }

    const body = await request.json();
    const data = updateFilterSchema.parse(body);

    // Check for duplicate name if name is being changed
    if (data.name && data.name !== existingFilter.name) {
      const duplicate = await prisma.savedFilter.findFirst({
        where: {
          projectId,
          userId: session.user.id,
          name: data.name,
          NOT: { id: filterId },
        },
      });

      if (duplicate) {
        return NextResponse.json({ error: "Filter with this name already exists" }, { status: 400 });
      }
    }

    const filter = await prisma.savedFilter.update({
      where: { id: filterId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.filters && { filters: data.filters }),
        ...(data.isShared !== undefined && { isShared: data.isShared }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ filter });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating saved filter:", error);
    return NextResponse.json({ error: "Failed to update saved filter" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { projectId, filterId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if filter exists and belongs to the user
    const existingFilter = await prisma.savedFilter.findFirst({
      where: {
        id: filterId,
        projectId,
        userId: session.user.id, // Only owner can delete
      },
    });

    if (!existingFilter) {
      return NextResponse.json({ error: "Filter not found or access denied" }, { status: 404 });
    }

    await prisma.savedFilter.delete({
      where: { id: filterId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting saved filter:", error);
    return NextResponse.json({ error: "Failed to delete saved filter" }, { status: 500 });
  }
}
