import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// Check if a slug is available (excluding current org)
async function isSlugAvailable(slug: string, excludeOrgId: string): Promise<boolean> {
  const existing = await prisma.organization.findUnique({
    where: { slug },
  });
  return !existing || existing.id === excludeOrgId;
}

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").optional(),
  image: z.string().url().nullable().optional(),
});

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

// GET /api/organizations/[orgId] - Get organization details
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

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      organization: {
        ...organization,
        userRole: membership.role,
      },
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json({ error: "Failed to fetch organization" }, { status: 500 });
  }
}

// PATCH /api/organizations/[orgId] - Update organization (OWNER/ADMIN only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const data = updateOrganizationSchema.parse(body);

    // If updating slug, check availability
    if (data.slug) {
      const available = await isSlugAvailable(data.slug, orgId);
      if (!available) {
        return NextResponse.json({ error: "This slug is already in use" }, { status: 400 });
      }
    }

    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.image !== undefined && { image: data.image }),
      },
      include: {
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    });

    return NextResponse.json({
      organization: {
        ...organization,
        userRole: membership.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error updating organization:", error);
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}

// DELETE /api/organizations/[orgId] - Delete organization (OWNER only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check user is OWNER
    const membership = await getUserOrgMembership(orgId, session.user.id);
    if (!membership || membership.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden - only organization owners can delete" }, { status: 403 });
    }

    // Delete organization (cascade deletes members and projects)
    await prisma.organization.delete({
      where: { id: orgId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting organization:", error);
    return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 });
  }
}
