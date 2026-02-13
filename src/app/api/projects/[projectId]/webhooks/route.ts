import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProjectKey } from "@/lib/task-lookup";
import { z } from "zod";

const webhookTriggers = [
  "TASK_CREATED",
  "TASK_UPDATED",
  "TASK_DELETED",
  "STATUS_CHANGED",
  "PR_CREATED",
  "PR_MERGED",
  "COMMENT_ADDED",
  "SPRINT_STARTED",
  "SPRINT_COMPLETED",
] as const;

const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  secret: z.string().optional(),
  triggers: z.array(z.enum(webhookTriggers)).min(1),
  enabled: z.boolean().optional().default(true),
});

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET - List all webhooks for a project
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const whereClause = isProjectKey(projectId)
      ? { projectKey: projectId }
      : { id: projectId };

    const project = await prisma.project.findFirst({
      where: {
        ...whereClause,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } } } },
        ],
      },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const webhooks = await prisma.projectWebhook.findMany({
      where: { projectId: project.id },
      include: {
        _count: { select: { deliveries: true } },
        deliveries: {
          orderBy: { deliveredAt: "desc" },
          take: 1,
          select: {
            id: true,
            success: true,
            deliveredAt: true,
            responseCode: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Don't expose secrets
    const sanitizedWebhooks = webhooks.map(({ secret, ...webhook }) => ({
      ...webhook,
      hasSecret: !!secret,
    }));

    return NextResponse.json({ webhooks: sanitizedWebhooks });
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500 });
  }
}

// POST - Create a new webhook
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createWebhookSchema.parse(body);

    const whereClause = isProjectKey(projectId)
      ? { projectKey: projectId }
      : { id: projectId };

    const project = await prisma.project.findFirst({
      where: {
        ...whereClause,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } } } },
        ],
      },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const webhook = await prisma.projectWebhook.create({
      data: {
        name: data.name,
        url: data.url,
        secret: data.secret,
        triggers: data.triggers,
        enabled: data.enabled,
        projectId: project.id,
      },
    });

    // Don't expose secret in response
    const { secret, ...sanitizedWebhook } = webhook;

    return NextResponse.json({
      webhook: { ...sanitizedWebhook, hasSecret: !!secret },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Error creating webhook:", error);
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
}
