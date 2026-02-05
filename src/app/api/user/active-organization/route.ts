import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const setActiveOrgSchema = z.object({
  organizationId: z.string().nullable(),
});

// GET /api/user/active-organization - Get current active organization
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        defaultOrganizationId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If user has a default org, get its details
    let organization = null;
    if (user.defaultOrganizationId) {
      organization = await prisma.organization.findUnique({
        where: { id: user.defaultOrganizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
        },
      });
    }

    return NextResponse.json({
      activeOrganizationId: user.defaultOrganizationId,
      organization,
    });
  } catch (error) {
    console.error("Error fetching active organization:", error);
    return NextResponse.json({ error: "Failed to fetch active organization" }, { status: 500 });
  }
}

// PUT /api/user/active-organization - Set active organization
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = setActiveOrgSchema.parse(body);

    // If setting to an organization, verify user is a member
    if (data.organizationId) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: data.organizationId,
            userId: session.user.id,
          },
        },
      });

      if (!membership) {
        return NextResponse.json({ error: "You are not a member of this organization" }, { status: 403 });
      }
    }

    // Update user's default organization
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        defaultOrganizationId: data.organizationId,
      },
    });

    // Get organization details if set
    let organization = null;
    if (data.organizationId) {
      organization = await prisma.organization.findUnique({
        where: { id: data.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
        },
      });
    }

    return NextResponse.json({
      activeOrganizationId: data.organizationId,
      organization,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error setting active organization:", error);
    return NextResponse.json({ error: "Failed to set active organization" }, { status: 500 });
  }
}
