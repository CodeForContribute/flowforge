import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SprintBoard } from "@/components/sprints/SprintBoard";
import { isProjectKey } from "@/lib/task-lookup";

interface SprintDetailPageProps {
  params: Promise<{ projectId: string; sprintId: string }>;
}

export default async function SprintDetailPage({ params }: SprintDetailPageProps) {
  const { projectId, sprintId } = await params;
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

  const sprint = await prisma.sprint.findFirst({
    where: {
      id: sprintId,
      projectId: project.id,
    },
  });

  if (!sprint) {
    notFound();
  }

  // Fetch sprint tasks
  const sprintTasks = await prisma.task.findMany({
    where: {
      projectId: project.id,
      sprintId,
    },
    include: {
      assignee: {
        select: { id: true, name: true, image: true },
      },
      labels: true,
      _count: {
        select: { comments: true, subtasks: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Fetch backlog tasks (for the planning board)
  const backlogTasks = await prisma.task.findMany({
    where: {
      projectId: project.id,
      sprintId: null,
    },
    include: {
      assignee: {
        select: { id: true, name: true, image: true },
      },
      labels: true,
      _count: {
        select: { comments: true, subtasks: true },
      },
    },
    orderBy: [
      { priority: "desc" },
      { updatedAt: "desc" },
    ],
  });

  // Calculate sprint stats
  const totalTasks = sprintTasks.length;
  const completedTasks = sprintTasks.filter(
    (t) => t.status === "MERGED" || t.status === "CLOSED"
  ).length;
  const totalPoints = sprintTasks.reduce(
    (sum, t) => sum + (t.storyPoints || 0),
    0
  );
  const completedPoints = sprintTasks
    .filter((t) => t.status === "MERGED" || t.status === "CLOSED")
    .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  const sprintWithStats = {
    ...sprint,
    stats: {
      totalTasks,
      completedTasks,
      totalPoints,
      completedPoints,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    },
  };

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
                  <Link href={`/project/${project.projectKey}/sprint`}>
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <div>
                  <h1 className="text-xl font-bold">{sprint.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    Sprint Planning
                  </p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <SprintBoard
              sprint={sprintWithStats}
              projectKey={project.projectKey}
              sprintTasks={sprintTasks}
              backlogTasks={backlogTasks}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
