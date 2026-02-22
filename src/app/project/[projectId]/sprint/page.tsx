import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SprintListPage } from "@/components/sprints/SprintListPage";
import { isProjectKey } from "@/lib/task-lookup";

interface SprintPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function SprintPage({ params }: SprintPageProps) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Support both CUID and projectKey lookups
  const projectWhereClause = isProjectKey(projectId)
    ? { projectKey: projectId }
    : { id: projectId };

  const project = await prisma.project.findFirst({
    where: {
      ...projectWhereClause,
      OR: [
        { userId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (!project) {
    notFound();
  }

  // Fetch all sprints with task counts
  const sprints = await prisma.sprint.findMany({
    where: { projectId: project.id },
    include: {
      tasks: {
        select: {
          id: true,
          status: true,
          storyPoints: true,
        },
      },
    },
    orderBy: { startDate: "desc" },
  });

  // Calculate stats for each sprint
  const sprintsWithStats = sprints.map((sprint) => {
    const totalTasks = sprint.tasks.length;
    const completedTasks = sprint.tasks.filter(
      (t) => t.status === "MERGED" || t.status === "CLOSED"
    ).length;
    const totalPoints = sprint.tasks.reduce(
      (sum, t) => sum + (t.storyPoints || 0),
      0
    );
    const completedPoints = sprint.tasks
      .filter((t) => t.status === "MERGED" || t.status === "CLOSED")
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    return {
      ...sprint,
      stats: {
        totalTasks,
        completedTasks,
        totalPoints,
        completedPoints,
        progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
    };
  });

  // Check if AI is enabled for this project
  const aiSettings = await prisma.projectAISettings.findUnique({
    where: { projectId: project.id },
    select: { aiEnabled: true },
  });
  const aiEnabled = aiSettings?.aiEnabled ?? false;

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, projectKey: true },
  });

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar projects={projects} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b bg-background px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/project/${project.projectKey}`}>
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <div>
                  <h1 className="text-xl font-bold">Sprints</h1>
                  <p className="text-sm text-muted-foreground">
                    {sprints.length} sprints
                  </p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <SprintListPage sprints={sprintsWithStats} projectId={project.id} projectKey={project.projectKey} aiEnabled={aiEnabled} />
          </main>
        </div>
      </div>
    </div>
  );
}
