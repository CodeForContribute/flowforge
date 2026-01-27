import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const testKeySchema = z.object({
  provider: z.enum(["openai", "anthropic"]),
  apiKey: z.string().min(1),
});

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const { provider, apiKey } = testKeySchema.parse(body);

    if (provider === "openai") {
      try {
        const openai = new OpenAI({ apiKey });
        // Make a minimal API call to verify the key
        await openai.models.list();
        return NextResponse.json({ valid: true, message: "OpenAI API key is valid" });
      } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        if (err.status === 401) {
          return NextResponse.json({ valid: false, message: "Invalid OpenAI API key" });
        }
        return NextResponse.json({ valid: false, message: err.message || "Failed to validate key" });
      }
    }

    if (provider === "anthropic") {
      try {
        const anthropic = new Anthropic({ apiKey });
        // Make a minimal API call to verify the key
        await anthropic.messages.create({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "test" }],
        });
        return NextResponse.json({ valid: true, message: "Anthropic API key is valid" });
      } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        if (err.status === 401) {
          return NextResponse.json({ valid: false, message: "Invalid Anthropic API key" });
        }
        return NextResponse.json({ valid: false, message: err.message || "Failed to validate key" });
      }
    }

    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error testing API key:", error);
    return NextResponse.json({ error: "Failed to test API key" }, { status: 500 });
  }
}
