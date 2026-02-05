import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProjectSettingsLayout } from "@/components/settings/ProjectSettingsLayout";
import { MembersSettings } from "@/components/settings/MembersSettings";
import { MemberRole } from "@/types";
import { isProjectKey } from "@/lib/task-lookup";

interface MembersPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function MembersPage({ params }: MembersPageProps) {
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
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const isOwner = project.userId === session.user.id;

  // Fetch project members
  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId: project.id },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Combine owner (if personal project) with members
  const ownerMember = project.userId && project.user
    ? [{
        id: "owner",
        role: "OWNER" as MemberRole,
        userId: project.userId,
        user: project.user,
      }]
    : [];

  const allMembers = [
    ...ownerMember,
    ...projectMembers.map((m) => ({
      id: m.id,
      role: m.role as MemberRole,
      userId: m.userId,
      user: m.user,
    })),
  ];

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
            <MembersSettings
              projectId={project.id}
              members={allMembers}
              currentUserId={session.user.id}
              isOwner={isOwner}
            />
          </ProjectSettingsLayout>
        </main>
      </div>
    </div>
  );
}
