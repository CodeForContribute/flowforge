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

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  secret: z.string().nullable().optional(),
  triggers: z.array(z.enum(webhookTriggers)).min(1).optional(),
  enabled: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ projectId: string; webhookId: string }>;
}

// GET - Get webhook details with recent deliveries
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { projectId, webhookId } = await params;
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

    const webhook = await prisma.projectWebhook.findFirst({
      where: {
        id: webhookId,
        projectId: project.id,
      },
      include: {
        deliveries: {
          orderBy: { deliveredAt: "desc" },
          take: 20,
        },
      },
    });

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Don't expose secret
    const { secret, ...sanitizedWebhook } = webhook;

    return NextResponse.json({
      webhook: { ...sanitizedWebhook, hasSecret: !!secret },
    });
  } catch (error) {
    console.error("Error fetching webhook:", error);
    return NextResponse.json({ error: "Failed to fetch webhook" }, { status: 500 });
  }
}

// PATCH - Update a webhook
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { projectId, webhookId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateWebhookSchema.parse(body);

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

    const webhook = await prisma.projectWebhook.findFirst({
      where: {
        id: webhookId,
        projectId: project.id,
      },
    });

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const updated = await prisma.projectWebhook.update({
      where: { id: webhookId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.secret !== undefined && { secret: data.secret }),
        ...(data.triggers !== undefined && { triggers: data.triggers }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
      },
    });

    // Don't expose secret
    const { secret, ...sanitizedWebhook } = updated;

    return NextResponse.json({
      webhook: { ...sanitizedWebhook, hasSecret: !!secret },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Error updating webhook:", error);
    return NextResponse.json({ error: "Failed to update webhook" }, { status: 500 });
  }
}

// DELETE - Delete a webhook
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { projectId, webhookId } = await params;
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

    const webhook = await prisma.projectWebhook.findFirst({
      where: {
        id: webhookId,
        projectId: project.id,
      },
    });

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    await prisma.projectWebhook.delete({
      where: { id: webhookId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
  }
}
