import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ orgId: string }>;
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

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).default("MEMBER"),
});

// GET /api/organizations/[orgId]/members - List organization members
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check user is a member of this organization
    const membership = await getUserOrgMembership(orgId, session.user.id);
    if (!membership) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
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
      orderBy: [
        { role: "asc" }, // OWNERs first, then ADMINs, then MEMBERs
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error fetching organization members:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

// POST /api/organizations/[orgId]/members - Add member to organization
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check user is OWNER or ADMIN
    const membership = await getUserOrgMembership(orgId, session.user.id);
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = addMemberSchema.parse(body);

    // Only OWNERs can add other OWNERs
    if (data.role === "OWNER" && membership.role !== "OWNER") {
      return NextResponse.json({ error: "Only owners can add other owners" }, { status: 403 });
    }

    // Find user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!userToAdd) {
      return NextResponse.json({ error: "User not found with this email" }, { status: 404 });
    }

    // Check if user is already a member
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: userToAdd.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 });
    }

    // Add member
    const newMember = await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: userToAdd.id,
        role: data.role,
      },
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

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error adding organization member:", error);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}
