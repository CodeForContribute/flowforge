import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ orgId: string; memberId: string }>;
}

// Helper to get user's membership in an organization
async function getUserOrgMembership(orgId: string, userId: string) {
  return prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId,
      },
    },
  });
}

const updateMemberSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

// PATCH /api/organizations/[orgId]/members/[memberId] - Update member role
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { orgId, memberId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check user is OWNER or ADMIN
    const myMembership = await getUserOrgMembership(orgId, session.user.id);
    if (!myMembership || (myMembership.role !== "OWNER" && myMembership.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the member to update
    const targetMember = await prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId: orgId,
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = updateMemberSchema.parse(body);

    // Only OWNERs can change roles to/from OWNER
    if (
      (data.role === "OWNER" || targetMember.role === "OWNER") &&
      myMembership.role !== "OWNER"
    ) {
      return NextResponse.json({ error: "Only owners can modify owner roles" }, { status: 403 });
    }

    // Can't demote self if you're the only owner
    if (targetMember.userId === session.user.id && targetMember.role === "OWNER" && data.role !== "OWNER") {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json({ error: "Cannot demote the only owner" }, { status: 400 });
      }
    }

    // ADMINs cannot change other ADMINs or OWNERs
    if (
      myMembership.role === "ADMIN" &&
      (targetMember.role === "ADMIN" || targetMember.role === "OWNER") &&
      targetMember.userId !== session.user.id
    ) {
      return NextResponse.json({ error: "Admins can only change member roles" }, { status: 403 });
    }

    const updatedMember = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: data.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error updating organization member:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

// DELETE /api/organizations/[orgId]/members/[memberId] - Remove member from organization
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { orgId, memberId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check user is OWNER or ADMIN
    const myMembership = await getUserOrgMembership(orgId, session.user.id);
    if (!myMembership || (myMembership.role !== "OWNER" && myMembership.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the member to remove
    const targetMember = await prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId: orgId,
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Only OWNERs can remove other OWNERs
    if (targetMember.role === "OWNER" && myMembership.role !== "OWNER") {
      return NextResponse.json({ error: "Only owners can remove other owners" }, { status: 403 });
    }

    // ADMINs cannot remove other ADMINs
    if (targetMember.role === "ADMIN" && myMembership.role === "ADMIN" && targetMember.userId !== session.user.id) {
      return NextResponse.json({ error: "Admins cannot remove other admins" }, { status: 403 });
    }

    // Can't remove self if you're the only owner
    if (targetMember.userId === session.user.id && targetMember.role === "OWNER") {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json({ error: "Cannot remove the only owner" }, { status: 400 });
      }
    }

    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing organization member:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
