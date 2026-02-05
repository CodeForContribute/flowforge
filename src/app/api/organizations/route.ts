import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Generate a URL-friendly slug from organization name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

// Check if a slug is available
async function isSlugAvailable(slug: string, excludeOrgId?: string): Promise<boolean> {
  const existing = await prisma.organization.findUnique({
    where: { slug },
  });
  return !existing || (excludeOrgId !== undefined && existing.id === excludeOrgId);
}

// Generate a unique slug by appending numbers if needed
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (!(await isSlugAvailable(slug))) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").optional(),
  image: z.string().url().optional(),
});

// GET /api/organizations - List user's organizations
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const organizations = await prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
        members: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Transform to include user's role in each org
    const orgsWithRole = organizations.map((org) => ({
      ...org,
      userRole: org.members[0]?.role || null,
      members: undefined, // Remove the members array from response
    }));

    return NextResponse.json({ organizations: orgsWithRole });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
  }
}

// POST /api/organizations - Create organization (user becomes OWNER)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createOrganizationSchema.parse(body);

    // Handle slug - validate if provided, or auto-generate
    let slug: string;
    if (data.slug) {
      const available = await isSlugAvailable(data.slug);
      if (!available) {
        return NextResponse.json({ error: "This slug is already in use" }, { status: 400 });
      }
      slug = data.slug;
    } else {
      slug = await generateUniqueSlug(data.name);
    }

    // Create organization and add creator as OWNER in a transaction
    const organization = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.name,
          description: data.description,
          slug,
          image: data.image,
        },
      });

      // Add creator as OWNER
      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: session.user.id,
          role: "OWNER",
        },
      });

      return org;
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error creating organization:", error);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}
