import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { isProjectKey, isTaskKey } from "@/lib/task-lookup";
import { MergeConflictInfo } from "@/types";

interface TaskPageProps {
  params: Promise<{ projectId: string; taskId: string }>;
}

export default async function TaskPage({ params }: TaskPageProps) {
  const { projectId, taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Support both CUID and human-readable key lookups
  const projectWhereClause = isProjectKey(projectId)
    ? { projectKey: projectId }
    : { id: projectId };

  const taskWhereClause = isTaskKey(taskId)
    ? { taskKey: taskId }
    : { id: taskId };

  const task = await prisma.task.findFirst({
    where: {
      ...taskWhereClause,
      project: {
        ...projectWhereClause,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
    },
    include: {
      project: true,
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
      sprint: {
        select: { id: true, name: true, status: true },
      },
      parentTask: {
        select: { id: true, title: true, taskType: true, status: true, taskKey: true },
      },
      subtasks: {
        select: {
          id: true,
          title: true,
          taskType: true,
          status: true,
          priority: true,
          storyPoints: true,
          taskKey: true,
          assignee: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      labels: true,
      comments: {
        include: {
          user: true,
          reactions: {
            include: {
              user: {
                select: { id: true, name: true, image: true },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      executions: {
        orderBy: { createdAt: "desc" },
      },
      attachments: {
        include: {
          uploadedBy: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!task) {
    notFound();
  }

  // Cast conflictInfo from Prisma JsonValue to proper type
  const taskWithTypedConflictInfo = {
    ...task,
    conflictInfo: task.conflictInfo as MergeConflictInfo | null,
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
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          <TaskDetail task={taskWithTypedConflictInfo} currentUserId={session.user.id} />
        </main>
      </div>
    </div>
  );
}
