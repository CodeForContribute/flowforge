import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { isProjectKey, isTaskKey } from "@/lib/task-lookup";

interface EditTaskPageProps {
  params: Promise<{ projectId: string; taskId: string }>;
}

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const { projectId, taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Support both CUID and taskKey lookups
  const taskWhereClause = isTaskKey(taskId)
    ? { taskKey: taskId }
    : { id: taskId };

  // Support both CUID and projectKey lookups
  const projectWhereClause = isProjectKey(projectId)
    ? { projectKey: projectId }
    : { id: projectId };

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
      project: {
        select: { id: true, projectKey: true },
      },
      labels: {
        select: { id: true, name: true, color: true },
      },
    },
  });

  if (!task) {
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
    select: { id: true, name: true, projectKey: true },
  });

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar projects={projects} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          <TaskForm
            mode="edit"
            projectId={task.project.id}
            projectKey={task.project.projectKey}
            initialData={{
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              taskType: task.taskType,
              storyPoints: task.storyPoints,
              dueDate: task.dueDate,
              assigneeId: task.assigneeId,
              sprintId: task.sprintId,
              parentTaskId: task.parentTaskId,
              taskKey: task.taskKey,
              labels: task.labels,
            }}
          />
        </main>
      </div>
    </div>
  );
}
