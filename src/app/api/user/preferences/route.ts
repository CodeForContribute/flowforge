import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updatePreferencesSchema = z.object({
  notifyPrCreated: z.boolean().optional(),
  notifyPrMerged: z.boolean().optional(),
  notifyReviewRequested: z.boolean().optional(),
  notifyTaskCompleted: z.boolean().optional(),
  notifyTaskFailed: z.boolean().optional(),
  showActivityStatus: z.boolean().optional(),
  shareUsageAnalytics: z.boolean().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  toursCompleted: z.record(z.boolean()).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get or create preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: { userId: session.user.id },
      });
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updatePreferencesSchema.parse(body);

    // Upsert preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      update: data,
      create: {
        userId: session.user.id,
        ...data,
      },
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error updating preferences:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
