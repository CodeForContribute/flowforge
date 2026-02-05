import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateVersionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  status: z.enum(["UNRELEASED", "RELEASED", "ARCHIVED"]).optional(),
});

// GET /api/projects/[projectId]/versions/[versionId] - Get version details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; versionId: string }> }
) {
  const { projectId, versionId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const version = await prisma.version.findFirst({
      where: {
        id: versionId,
        projectId,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
      },
      include: {
        _count: {
          select: { tasks: true },
        },
        tasks: {
          select: {
            id: true,
            taskKey: true,
            title: true,
            status: true,
            priority: true,
            storyPoints: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    return NextResponse.json(version);
  } catch (error) {
    console.error("Error fetching version:", error);
    return NextResponse.json({ error: "Failed to fetch version" }, { status: 500 });
  }
}

// PATCH /api/projects/[projectId]/versions/[versionId] - Update a version
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; versionId: string }> }
) {
  const { projectId, versionId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateVersionSchema.parse(body);

    // Verify version exists and user has access
    const existing = await prisma.version.findFirst({
      where: {
        id: versionId,
        projectId,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Check for name conflict
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.version.findUnique({
        where: {
          projectId_name: { projectId, name: data.name },
        },
      });

      if (duplicate) {
        return NextResponse.json({ error: "A version with this name already exists" }, { status: 400 });
      }
    }

    // Update version
    const version = await prisma.version.update({
      where: { id: versionId },
      data: {
        ...data,
        releaseDate: data.releaseDate !== undefined
          ? (data.releaseDate ? new Date(data.releaseDate) : null)
          : undefined,
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    return NextResponse.json(version);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Error updating version:", error);
    return NextResponse.json({ error: "Failed to update version" }, { status: 500 });
  }
}

// DELETE /api/projects/[projectId]/versions/[versionId] - Delete a version
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; versionId: string }> }
) {
  const { projectId, versionId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify version exists and user has access
    const version = await prisma.version.findFirst({
      where: {
        id: versionId,
        projectId,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } } } },
          ],
        },
      },
    });

    if (!version) {
      return NextResponse.json({ error: "Version not found or not authorized" }, { status: 404 });
    }

    // Remove version reference from tasks first
    await prisma.task.updateMany({
      where: { versionId },
      data: { versionId: null },
    });

    // Delete version
    await prisma.version.delete({
      where: { id: versionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting version:", error);
    return NextResponse.json({ error: "Failed to delete version" }, { status: 500 });
  }
}
