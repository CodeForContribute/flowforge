import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

interface TaskPageProps {
  params: Promise<{ projectId: string; taskId: string }>;
}

export default async function TaskPage({ params }: TaskPageProps) {
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
      project: true,
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
      sprint: {
        select: { id: true, name: true, status: true },
      },
      parentTask: {
        select: { id: true, title: true, taskType: true, status: true },
      },
      subtasks: {
        select: {
          id: true,
          title: true,
          taskType: true,
          status: true,
          priority: true,
          storyPoints: true,
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
        },
        orderBy: { createdAt: "asc" },
      },
      executions: {
        orderBy: { createdAt: "desc" },
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
          <TaskDetail task={task} />
        </main>
      </div>
    </div>
  );
}
