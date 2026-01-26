import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

interface RouteParams {
  params: Promise<{ labelId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { labelId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateLabelSchema.parse(body);

    // Verify label access
    const existingLabel = await prisma.label.findFirst({
      where: {
        id: labelId,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } } } },
          ],
        },
      },
    });

    if (!existingLabel) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name !== existingLabel.name) {
      const duplicateLabel = await prisma.label.findFirst({
        where: {
          projectId: existingLabel.projectId,
          name: data.name,
          id: { not: labelId },
        },
      });

      if (duplicateLabel) {
        return NextResponse.json(
          { error: "A label with this name already exists" },
          { status: 400 }
        );
      }
    }

    const label = await prisma.label.update({
      where: { id: labelId },
      data,
    });

    return NextResponse.json({ label });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating label:", error);
    return NextResponse.json({ error: "Failed to update label" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { labelId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify label access
    const existingLabel = await prisma.label.findFirst({
      where: {
        id: labelId,
        project: {
          OR: [
            { userId: session.user.id },
            { members: { some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } } } },
          ],
        },
      },
    });

    if (!existingLabel) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    await prisma.label.delete({
      where: { id: labelId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting label:", error);
    return NextResponse.json({ error: "Failed to delete label" }, { status: 500 });
  }
}
