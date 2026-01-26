import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { BacklogList } from "@/components/backlog/BacklogList";

interface BacklogPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function BacklogPage({ params }: BacklogPageProps) {
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
  });

  if (!project) {
    notFound();
  }

  // Fetch backlog tasks (tasks without a sprint assigned)
  const backlogTasks = await prisma.task.findMany({
    where: {
      projectId,
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

  // Fetch sprints for assignment
  const sprints = await prisma.sprint.findMany({
    where: {
      projectId,
      status: { in: ["PLANNING", "ACTIVE"] },
    },
    orderBy: { startDate: "asc" },
  });

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
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/project/${projectId}`}>
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <div>
                  <h1 className="text-xl font-bold">Backlog</h1>
                  <p className="text-sm text-muted-foreground">
                    {backlogTasks.length} tasks in backlog
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link href={`/project/${projectId}/task/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Link>
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <BacklogList
              tasks={backlogTasks}
              sprints={sprints}
              projectId={projectId}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
