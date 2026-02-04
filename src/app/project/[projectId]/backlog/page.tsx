import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowLeft, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { BacklogList } from "@/components/backlog/BacklogList";
import { isProjectKey } from "@/lib/task-lookup";

interface BacklogPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    search?: string;
    assignee?: string;
    sprint?: string;
    labels?: string;
    type?: string;
    status?: string;
    priority?: string;
    overdue?: string;
  }>;
}

export default async function BacklogPage({ params, searchParams }: BacklogPageProps) {
  const { projectId } = await params;
  const filters = await searchParams;
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

  // Build filter conditions
  const whereConditions: Prisma.TaskWhereInput = {
    projectId: project.id,
    sprintId: null,
  };

  // Search filter
  if (filters.search) {
    whereConditions.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // Assignee filter
  if (filters.assignee) {
    whereConditions.assigneeId = filters.assignee;
  }

  // Type filter
  if (filters.type) {
    whereConditions.taskType = filters.type as Prisma.EnumTaskTypeFilter["equals"];
  }

  // Status filter
  if (filters.status) {
    whereConditions.status = filters.status as Prisma.EnumTaskStatusFilter["equals"];
  }

  // Priority filter
  if (filters.priority) {
    whereConditions.priority = filters.priority as Prisma.EnumTaskPriorityFilter["equals"];
  }

  // Labels filter
  if (filters.labels) {
    const labelIds = filters.labels.split(",").filter(Boolean);
    if (labelIds.length > 0) {
      whereConditions.labels = {
        some: {
          id: { in: labelIds },
        },
      };
    }
  }

  // Overdue filter
  if (filters.overdue === "true") {
    whereConditions.dueDate = {
      lt: new Date(),
    };
  }

  // Fetch backlog tasks with filters
  const backlogTasks = await prisma.task.findMany({
    where: whereConditions,
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
      projectId: project.id,
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
    select: { id: true, name: true, projectKey: true },
  });

  // Calculate quick stats for header
  const totalPoints = backlogTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

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
                  <Link href={`/project/${project.projectKey}`}>
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <LayoutList className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold">Backlog</h1>
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {project.projectKey}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {backlogTasks.length} tasks • {totalPoints} story points
                    </p>
                  </div>
                </div>
              </div>
              <Button asChild className="shadow-lg shadow-primary/20">
                <Link href={`/project/${project.projectKey}/task/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Link>
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6 bg-muted/30">
            <BacklogList
              tasks={backlogTasks}
              sprints={sprints}
              projectId={project.id}
              projectKey={project.projectKey}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
