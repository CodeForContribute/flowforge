import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MetricsPanel } from "@/components/metrics/MetricsPanel";
import { isProjectKey } from "@/lib/task-lookup";

interface MetricsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function MetricsPage({ params }: MetricsPageProps) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Support both CUID and projectKey lookups
  const whereClause = isProjectKey(projectId)
    ? { projectKey: projectId }
    : { id: projectId };

  const project = await prisma.project.findFirst({
    where: {
      ...whereClause,
      OR: [
        { userId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (!project) {
    notFound();
  }

  // Fetch all tasks for metrics (including dates for CFD and Created/Resolved charts)
  const tasks = await prisma.task.findMany({
    where: { projectId: project.id },
    select: {
      id: true,
      status: true,
      priority: true,
      storyPoints: true,
      dueDate: true,
      assigneeId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Fetch sprints with their tasks
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

  // Fetch project members
  const members = await prisma.projectMember.findMany({
    where: { projectId: project.id },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  // Include project owner as a member (if personal project)
  const owner = project.userId
    ? await prisma.user.findUnique({
        where: { id: project.userId },
        select: { id: true, name: true },
      })
    : null;

  const allMembers = owner
    ? [
        {
          id: "owner",
          userId: owner.id,
          user: { name: owner.name },
        },
        ...members.map((m) => ({
          id: m.id,
          userId: m.userId,
          user: { name: m.user.name },
        })),
      ]
    : members.map((m) => ({
        id: m.id,
        userId: m.userId,
        user: { name: m.user.name },
      }));

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

  // Calculate quick stats for header
  const completedTasks = tasks.filter(t => t.status === "MERGED" || t.status === "CLOSED").length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar projects={projects} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Modern Header */}
          <header className="border-b bg-gradient-to-r from-background via-background to-muted/30 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="shrink-0" asChild>
                  <Link href={`/project/${project.projectKey || project.id}`}>
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold">Metrics</h1>
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {project.projectKey}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{tasks.length} total tasks</span>
                      <span className="text-xs">•</span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        {completionRate}% complete
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6 bg-muted/30">
            <MetricsPanel
              tasks={tasks}
              sprints={sprints}
              members={allMembers}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
