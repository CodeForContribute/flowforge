import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProjectSettingsLayout } from "@/components/settings/ProjectSettingsLayout";
import { DangerZoneSettings } from "@/components/settings/DangerZoneSettings";

interface DangerZonePageProps {
  params: Promise<{ projectId: string }>;
}

export default async function DangerZonePage({ params }: DangerZonePageProps) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: session.user.id, // Only owner can access danger zone
    },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });

  if (!project) {
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
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <ProjectSettingsLayout projectId={projectId} projectName={project.name}>
            <DangerZoneSettings
              projectId={project.id}
              projectName={project.name}
              taskCount={project._count.tasks}
            />
          </ProjectSettingsLayout>
        </main>
      </div>
    </div>
  );
}
