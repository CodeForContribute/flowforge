import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createFilterSchema = z.object({
  name: z.string().min(1).max(100),
  filters: z.object({
    status: z.array(z.string()).optional(),
    priority: z.array(z.string()).optional(),
    assigneeId: z.string().nullable().optional(),
    labelIds: z.array(z.string()).optional(),
    taskType: z.array(z.string()).optional(),
    sprintId: z.string().nullable().optional(),
    search: z.string().optional(),
  }),
  isShared: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
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

    // Get user's own filters + shared filters from others
    const filters = await prisma.savedFilter.findMany({
      where: {
        projectId,
        OR: [
          { userId: session.user.id },
          { isShared: true },
        ],
      },
      orderBy: [
        { isShared: "asc" }, // Own filters first
        { name: "asc" },
      ],
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

    return NextResponse.json({ filters });
  } catch (error) {
    console.error("Error fetching saved filters:", error);
    return NextResponse.json({ error: "Failed to fetch saved filters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
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
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    const body = await request.json();
    const data = createFilterSchema.parse(body);

    // Check for duplicate filter name for this user
    const existing = await prisma.savedFilter.findFirst({
      where: {
        projectId,
        userId: session.user.id,
        name: data.name,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Filter with this name already exists" }, { status: 400 });
    }

    const filter = await prisma.savedFilter.create({
      data: {
        name: data.name,
        filters: data.filters,
        isShared: data.isShared ?? false,
        projectId,
        userId: session.user.id,
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

    return NextResponse.json({ filter }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating saved filter:", error);
    return NextResponse.json({ error: "Failed to create saved filter" }, { status: 500 });
  }
}
