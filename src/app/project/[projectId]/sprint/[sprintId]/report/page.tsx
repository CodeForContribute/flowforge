import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SprintReport } from "@/components/sprints/SprintReport";
import { isProjectKey } from "@/lib/task-lookup";

interface SprintReportPageProps {
  params: Promise<{ projectId: string; sprintId: string }>;
}

export default async function SprintReportPage({ params }: SprintReportPageProps) {
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

  // Fetch the sprint
  const sprint = await prisma.sprint.findFirst({
    where: {
      id: sprintId,
      projectId: project.id,
    },
  });

  if (!sprint) {
    notFound();
  }

  // Fetch tasks for this sprint
  const tasks = await prisma.task.findMany({
    where: { sprintId: sprint.id },
    select: {
      id: true,
      title: true,
      taskKey: true,
      status: true,
      priority: true,
      storyPoints: true,
      createdAt: true,
      updatedAt: true,
      assignee: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Get previous sprint for velocity comparison
  const previousSprint = await prisma.sprint.findFirst({
    where: {
      projectId: project.id,
      status: "COMPLETED",
      endDate: { lt: sprint.startDate },
    },
    include: {
      tasks: {
        select: {
          status: true,
          storyPoints: true,
        },
      },
    },
    orderBy: { endDate: "desc" },
  });

  const previousSprintStats = previousSprint
    ? {
        completedPoints: previousSprint.tasks
          .filter((t) => t.status === "MERGED" || t.status === "CLOSED")
          .reduce((sum, t) => sum + (t.storyPoints || 0), 0),
        completedTasks: previousSprint.tasks.filter(
          (t) => t.status === "MERGED" || t.status === "CLOSED"
        ).length,
      }
    : null;

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
          {/* Header */}
          <header className="border-b bg-gradient-to-r from-background via-background to-muted/30 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="shrink-0" asChild>
                  <Link href={`/project/${project.projectKey}/sprint/${sprint.id}`}>
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold">Sprint Report</h1>
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {project.projectKey}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {sprint.name} - {tasks.length} tasks
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6 bg-muted/30">
            <SprintReport
              sprint={sprint}
              tasks={tasks}
              previousSprint={previousSprintStats}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
