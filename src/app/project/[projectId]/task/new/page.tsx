import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { isProjectKey } from "@/lib/task-lookup";

interface NewTaskPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function NewTaskPage({ params }: NewTaskPageProps) {
  const { projectId } = await params;
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
          <TaskForm mode="create" projectId={project.id} projectKey={project.projectKey} defaultBranch={project.defaultBranch} />
        </main>
      </div>
    </div>
  );
}
