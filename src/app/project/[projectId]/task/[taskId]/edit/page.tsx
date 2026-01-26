import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

interface EditTaskPageProps {
  params: Promise<{ projectId: string; taskId: string }>;
}

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const { projectId, taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      projectId: projectId,
      project: {
        userId: session.user.id,
      },
    },
    include: {
      labels: {
        select: { id: true, name: true, color: true },
      },
    },
  });

  if (!task) {
    notFound();
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar projects={projects} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          <TaskForm
            mode="edit"
            projectId={projectId}
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
              labels: task.labels,
            }}
          />
        </main>
      </div>
    </div>
  );
}
