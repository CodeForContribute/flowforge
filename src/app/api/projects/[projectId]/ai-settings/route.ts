import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, maskApiKey } from "@/lib/encryption";
import { z } from "zod";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const updateAISettingsSchema = z.object({
  aiEnabled: z.boolean().optional(),
  openaiApiKey: z.string().optional().nullable(),
  anthropicApiKey: z.string().optional().nullable(),
  preferredProvider: z.enum(["openai", "anthropic"]).optional(),
  autoExecuteTasks: z.boolean().optional(),
  autoRespondReviews: z.boolean().optional(),
  autoRespondComments: z.boolean().optional(),
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
    // Verify project access (owner or admin)
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

    // Get or create AI settings
    let aiSettings = await prisma.projectAISettings.findUnique({
      where: { projectId },
    });

    if (!aiSettings) {
      aiSettings = await prisma.projectAISettings.create({
        data: { projectId },
      });
    }

    // Return settings with masked API keys
    return NextResponse.json({
      settings: {
        id: aiSettings.id,
        aiEnabled: aiSettings.aiEnabled,
        preferredProvider: aiSettings.preferredProvider,
        autoExecuteTasks: aiSettings.autoExecuteTasks,
        autoRespondReviews: aiSettings.autoRespondReviews,
        autoRespondComments: aiSettings.autoRespondComments,
        // Only show if key is set, not the actual key
        hasOpenaiKey: !!aiSettings.openaiApiKey,
        hasAnthropicKey: !!aiSettings.anthropicApiKey,
        openaiKeyMasked: aiSettings.openaiApiKey
          ? maskApiKey(decrypt(aiSettings.openaiApiKey))
          : null,
        anthropicKeyMasked: aiSettings.anthropicApiKey
          ? maskApiKey(decrypt(aiSettings.anthropicApiKey))
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching AI settings:", error);
    return NextResponse.json({ error: "Failed to fetch AI settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    const body = await request.json();
    const data = updateAISettingsSchema.parse(body);

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (data.aiEnabled !== undefined) updateData.aiEnabled = data.aiEnabled;
    if (data.preferredProvider !== undefined) updateData.preferredProvider = data.preferredProvider;
    if (data.autoExecuteTasks !== undefined) updateData.autoExecuteTasks = data.autoExecuteTasks;
    if (data.autoRespondReviews !== undefined) updateData.autoRespondReviews = data.autoRespondReviews;
    if (data.autoRespondComments !== undefined) updateData.autoRespondComments = data.autoRespondComments;

    // Handle API keys - encrypt before storing
    if (data.openaiApiKey !== undefined) {
      updateData.openaiApiKey = data.openaiApiKey ? encrypt(data.openaiApiKey) : null;
    }
    if (data.anthropicApiKey !== undefined) {
      updateData.anthropicApiKey = data.anthropicApiKey ? encrypt(data.anthropicApiKey) : null;
    }

    // Upsert AI settings
    const aiSettings = await prisma.projectAISettings.upsert({
      where: { projectId },
      update: updateData,
      create: {
        projectId,
        ...updateData,
      },
    });

    return NextResponse.json({
      settings: {
        id: aiSettings.id,
        aiEnabled: aiSettings.aiEnabled,
        preferredProvider: aiSettings.preferredProvider,
        autoExecuteTasks: aiSettings.autoExecuteTasks,
        autoRespondReviews: aiSettings.autoRespondReviews,
        autoRespondComments: aiSettings.autoRespondComments,
        hasOpenaiKey: !!aiSettings.openaiApiKey,
        hasAnthropicKey: !!aiSettings.anthropicApiKey,
        openaiKeyMasked: aiSettings.openaiApiKey
          ? maskApiKey(decrypt(aiSettings.openaiApiKey))
          : null,
        anthropicKeyMasked: aiSettings.anthropicApiKey
          ? maskApiKey(decrypt(aiSettings.anthropicApiKey))
          : null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error updating AI settings:", error);
    return NextResponse.json({ error: "Failed to update AI settings" }, { status: 500 });
  }
}
