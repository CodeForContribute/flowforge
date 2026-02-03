import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProjectSettingsLayout } from "@/components/settings/ProjectSettingsLayout";
import { GeneralProjectSettings } from "@/components/settings/GeneralProjectSettings";
import { WipLimitsSettings } from "@/components/settings/WipLimitsSettings";
import { isProjectKey } from "@/lib/task-lookup";

interface ProjectSettingsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
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

  const isOwner = project.userId === session.user.id;

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar projects={projects} />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <ProjectSettingsLayout projectId={project.id} projectKey={project.projectKey} projectName={project.name}>
            <GeneralProjectSettings
              project={{
                id: project.id,
                name: project.name,
                description: project.description,
                githubRepo: project.githubRepo,
                defaultBranch: project.defaultBranch,
                reviewers: project.reviewers,
                agentModel: project.agentModel,
              }}
              isOwner={isOwner}
            />
            <WipLimitsSettings
              project={{
                id: project.id,
                wipLimits: project.wipLimits as Record<string, number> | null,
              }}
              isOwner={isOwner}
            />
          </ProjectSettingsLayout>
        </main>
      </div>
    </div>
  );
}
