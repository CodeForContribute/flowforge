import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRepoBranches } from "@/services/github";
import { decrypt } from "@/lib/encryption";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  console.log(`[Branches API] Fetching branches for project: ${projectId}`);

  // Get project and user's access token
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { userId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (!project) {
    console.log(`[Branches API] Project not found: ${projectId}`);
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  console.log(`[Branches API] Found project: ${project.name}, repo: ${project.githubRepo}`);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { accessToken: true },
  });

  if (!user?.accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  try {
    const [owner, repo] = project.githubRepo.split("/");
    if (!owner || !repo) {
      return NextResponse.json({ error: "Invalid repository format" }, { status: 400 });
    }

    let decryptedToken: string;
    try {
      decryptedToken = decrypt(user.accessToken);
    } catch (decryptError) {
      console.error("Error decrypting token:", decryptError);
      return NextResponse.json({
        branches: [project.defaultBranch],
        defaultBranch: project.defaultBranch,
        error: "Token decryption failed",
      });
    }

    const branches = await getRepoBranches(decryptedToken, owner, repo);

    console.log(`Fetched ${branches.length} branches for ${owner}/${repo}:`, branches.map(b => b.name));

    return NextResponse.json({
      branches: branches.map((b) => b.name),
      defaultBranch: project.defaultBranch,
    });
  } catch (error) {
    console.error("Error fetching branches:", error);
    // Return default branch as fallback
    return NextResponse.json({
      branches: [project.defaultBranch],
      defaultBranch: project.defaultBranch,
      error: error instanceof Error ? error.message : "Could not fetch branches from GitHub",
    });
  }
}
