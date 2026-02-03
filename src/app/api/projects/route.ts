import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validateProjectKey, isProjectKeyAvailable, generateUniqueProjectKey } from "@/lib/project-key";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  githubRepo: z.string().min(1),
  defaultBranch: z.string().default("main"),
  reviewers: z.array(z.string()).default([]),
  agentModel: z.string().default("gpt-4o"),
  projectKey: z.string().optional(), // If not provided, will be auto-generated
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createProjectSchema.parse(body);

    // Handle project key - validate if provided, or auto-generate
    let projectKey: string;
    if (data.projectKey) {
      // Validate format
      const validation = validateProjectKey(data.projectKey);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      // Check availability
      const available = await isProjectKeyAvailable(data.projectKey);
      if (!available) {
        return NextResponse.json({ error: "Project key is already in use" }, { status: 400 });
      }
      projectKey = data.projectKey;
    } else {
      // Auto-generate a unique key from project name
      projectKey = await generateUniqueProjectKey(data.name);
    }

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        githubRepo: data.githubRepo,
        defaultBranch: data.defaultBranch,
        reviewers: data.reviewers,
        agentModel: data.agentModel,
        projectKey,
        taskCounter: 0,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
