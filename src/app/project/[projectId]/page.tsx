import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Settings, Github, List, Target, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
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
          labels: true,
          _count: {
            select: { comments: true, subtasks: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
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
                  <Link href={`/project/${projectId}/backlog`}>
                    <List className="mr-2 h-4 w-4" />
                    Backlog
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/project/${projectId}/sprint`}>
                    <Target className="mr-2 h-4 w-4" />
                    Sprints
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/project/${projectId}/metrics`}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Metrics
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={`/project/${projectId}/task/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Task
                  </Link>
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <Link href={`/project/${projectId}/settings`}>
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-hidden bg-muted/30">
            <KanbanBoard
              projectId={project.id}
              tasks={project.tasks.map((task: typeof project.tasks[number]) => ({
                ...task,
                projectId: project.id,
              }))}
              wipLimits={(project.wipLimits as Record<string, number>) || {}}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
