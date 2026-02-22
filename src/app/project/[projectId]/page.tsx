import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Settings, Github, List, Target, BarChart3, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { isProjectKey } from "@/lib/task-lookup";
import { BoardColumn } from "@/types";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
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
    include: {
      tasks: {
        include: {
          assignee: {
            select: { id: true, name: true, image: true },
          },
          parentTask: {
            select: { id: true, title: true, taskKey: true, taskType: true },
          },
          labels: true,
          subtasks: {
            select: {
              id: true,
              title: true,
              status: true,
              taskKey: true,
            },
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: { comments: true, subtasks: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, image: true, email: true },
          },
        },
      },
      user: {
        select: { id: true, name: true, image: true, email: true },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Fetch sprints for the project
  const sprints = await prisma.sprint.findMany({
    where: { projectId: project.id },
    select: { id: true, name: true, status: true },
    orderBy: { startDate: "desc" },
  });

  const activeSprint = sprints.find((s) => s.status === "ACTIVE");

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
              <div>
                <h1 className="text-xl font-bold">{project.name}</h1>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Github className="h-4 w-4" />
                  <a
                    href={`https://github.com/${project.githubRepo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {project.githubRepo}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/project/${project.projectKey}/backlog`}>
                    <List className="mr-2 h-4 w-4" />
                    Backlog
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/project/${project.projectKey}/sprint`}>
                    <Target className="mr-2 h-4 w-4" />
                    Sprints
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/project/${project.projectKey}/metrics`}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Metrics
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/project/${project.projectKey}/activity`}>
                    <Activity className="mr-2 h-4 w-4" />
                    Activity
                  </Link>
                </Button>
                <Button asChild data-tour-id="new-task-button">
                  <Link href={`/project/${project.projectKey}/task/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Task
                  </Link>
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <Link href={`/project/${project.projectKey}/settings`}>
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-hidden bg-muted/30">
            <KanbanBoard
              projectId={project.id}
              projectKey={project.projectKey}
              tasks={project.tasks.map((task: typeof project.tasks[number]) => ({
                ...task,
                projectId: project.id,
              }))}
              sprints={sprints}
              defaultSprintId={activeSprint?.id ?? null}
              wipLimits={(project.wipLimits as Record<string, number>) || {}}
              boardColumns={(project.boardColumns as unknown as BoardColumn[]) || null}
              aiEnabled={aiEnabled}
              members={[
                // Include project owner (if personal project)
                ...(project.user ? [{ id: project.user.id, name: project.user.name, image: project.user.image }] : []),
                // Include all project members
                ...project.members.map((m: typeof project.members[number]) => ({
                  id: m.user.id,
                  name: m.user.name,
                  image: m.user.image,
                })),
              ]}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
