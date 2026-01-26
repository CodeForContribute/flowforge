import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateMemberSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

interface RouteParams {
  params: Promise<{ projectId: string; memberId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { projectId, memberId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateMemberSchema.parse(body);

    // Verify project ownership (only owner can change roles)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Only project owners can change member roles" }, { status: 403 });
    }

    const member = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role: data.role },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({ member });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error updating member:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { projectId, memberId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify project ownership or admin access, or self-removal
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id, role: "ADMIN" } } },
        ],
      },
    });

    const memberToRemove = await prisma.projectMember.findFirst({
      where: { id: memberId },
    });

    if (!memberToRemove) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Allow self-removal
    const isSelfRemoval = memberToRemove.userId === session.user.id;

    if (!project && !isSelfRemoval) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Unassign tasks from this member before removing
    await prisma.task.updateMany({
      where: {
        projectId,
        assigneeId: memberToRemove.userId,
      },
      data: { assigneeId: null },
    });

    await prisma.projectMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
