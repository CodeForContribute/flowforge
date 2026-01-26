import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Octokit } from "@octokit/rest";

const addMemberSchema = z.object({
  githubUsername: z.string().min(1),
  role: z.enum(["ADMIN", "MEMBER"]).optional(),
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
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, githubId: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, githubId: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Include project owner as a member with OWNER role
    const allMembers = [
      {
        id: "owner",
        role: "OWNER" as const,
        createdAt: project.createdAt,
        projectId,
        userId: project.userId,
        user: project.user,
      },
      ...members,
    ];

    return NextResponse.json({ members: allMembers });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = addMemberSchema.parse(body);

    // Verify project ownership or admin access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Look up user by GitHub username
    // First check if user exists in our database
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { githubId: data.githubUsername },
          // Also try to match by name if it looks like a GitHub username
        ],
      },
    });

    if (!user) {
      // Try to fetch from GitHub to verify the username exists
      const octokit = new Octokit({ auth: session.user.accessToken });
      try {
        const { data: githubUser } = await octokit.users.getByUsername({
          username: data.githubUsername,
        });

        // Check if this GitHub user is already registered
        user = await prisma.user.findFirst({
          where: { githubId: String(githubUser.id) },
        });

        if (!user) {
          return NextResponse.json(
            { error: `User "${data.githubUsername}" has not yet signed up for FlowForge. They need to log in first.` },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: `GitHub user "${data.githubUsername}" not found` },
          { status: 404 }
        );
      }
    }

    // Check if user is already a member or owner
    if (project.userId === user.id) {
      return NextResponse.json(
        { error: "This user is already the project owner" },
        { status: 400 }
      );
    }

    const existingMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "This user is already a project member" },
        { status: 400 }
      );
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: user.id,
        role: data.role || "MEMBER",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, githubId: true },
        },
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error adding member:", error);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}
