import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProjectKey } from "@/lib/task-lookup";
import { z } from "zod";

const slackIntegrationSchema = z.object({
  webhookUrl: z.string().url().startsWith("https://hooks.slack.com/"),
  channelName: z.string().min(1).max(100),
  enabled: z.boolean().optional().default(true),
  notifyTaskCreated: z.boolean().optional().default(true),
  notifyStatusChanged: z.boolean().optional().default(true),
  notifyPrCreated: z.boolean().optional().default(true),
  notifyPrMerged: z.boolean().optional().default(true),
  notifyComments: z.boolean().optional().default(false),
});

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET - Get Slack integration settings
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

    const integration = await prisma.slackIntegration.findUnique({
      where: { projectId: project.id },
    });

    if (!integration) {
      return NextResponse.json({ integration: null });
    }

    // Don't expose the full webhook URL for security
    return NextResponse.json({
      integration: {
        id: integration.id,
        channelName: integration.channelName,
        enabled: integration.enabled,
        notifyTaskCreated: integration.notifyTaskCreated,
        notifyStatusChanged: integration.notifyStatusChanged,
        notifyPrCreated: integration.notifyPrCreated,
        notifyPrMerged: integration.notifyPrMerged,
        notifyComments: integration.notifyComments,
        hasWebhook: !!integration.accessToken,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching Slack integration:", error);
    return NextResponse.json({ error: "Failed to fetch Slack integration" }, { status: 500 });
  }
}

// POST - Create or update Slack integration
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = slackIntegrationSchema.parse(body);

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

    // Test the webhook URL
    try {
      const testResponse = await fetch(data.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "✅ FlowForge Slack integration connected successfully!",
        }),
      });

      if (!testResponse.ok) {
        return NextResponse.json(
          { error: "Invalid Slack webhook URL - test message failed" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Could not connect to Slack webhook URL" },
        { status: 400 }
      );
    }

    // Upsert the integration
    const integration = await prisma.slackIntegration.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        teamId: "webhook",
        teamName: "Slack",
        channelId: "webhook",
        channelName: data.channelName,
        accessToken: data.webhookUrl, // Store webhook URL here
        botUserId: "webhook",
        enabled: data.enabled,
        notifyTaskCreated: data.notifyTaskCreated,
        notifyStatusChanged: data.notifyStatusChanged,
        notifyPrCreated: data.notifyPrCreated,
        notifyPrMerged: data.notifyPrMerged,
        notifyComments: data.notifyComments,
      },
      update: {
        channelName: data.channelName,
        accessToken: data.webhookUrl,
        enabled: data.enabled,
        notifyTaskCreated: data.notifyTaskCreated,
        notifyStatusChanged: data.notifyStatusChanged,
        notifyPrCreated: data.notifyPrCreated,
        notifyPrMerged: data.notifyPrMerged,
        notifyComments: data.notifyComments,
      },
    });

    return NextResponse.json({
      integration: {
        id: integration.id,
        channelName: integration.channelName,
        enabled: integration.enabled,
        notifyTaskCreated: integration.notifyTaskCreated,
        notifyStatusChanged: integration.notifyStatusChanged,
        notifyPrCreated: integration.notifyPrCreated,
        notifyPrMerged: integration.notifyPrMerged,
        notifyComments: integration.notifyComments,
        hasWebhook: true,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Error saving Slack integration:", error);
    return NextResponse.json({ error: "Failed to save Slack integration" }, { status: 500 });
  }
}

// DELETE - Remove Slack integration
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    await prisma.slackIntegration.delete({
      where: { projectId: project.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Slack integration:", error);
    return NextResponse.json({ error: "Failed to delete Slack integration" }, { status: 500 });
  }
}
