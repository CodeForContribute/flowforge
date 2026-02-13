import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProjectSettingsLayout } from "@/components/settings/ProjectSettingsLayout";
import { AIIntegrationsSettings } from "@/components/settings/AIIntegrationsSettings";
import { isProjectKey } from "@/lib/task-lookup";

interface AISettingsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function AISettingsPage({ params }: AISettingsPageProps) {
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
  });

  if (!project) {
    notFound();
  }

  const isOwner = project.userId === session.user.id;

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
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <ProjectSettingsLayout projectId={project.projectKey || project.id} projectName={project.name}>
            <AIIntegrationsSettings projectId={project.id} isOwner={isOwner} />
          </ProjectSettingsLayout>
        </main>
      </div>
    </div>
  );
}
