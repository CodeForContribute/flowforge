import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProjectSettingsLayout } from "@/components/settings/ProjectSettingsLayout";
import { MembersSettings } from "@/components/settings/MembersSettings";
import { MemberRole } from "@/types";

interface MembersPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
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
    where: { projectId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Combine owner with members
  const allMembers = [
    {
      id: "owner",
      role: "OWNER" as MemberRole,
      userId: project.userId,
      user: project.user,
    },
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
    select: { id: true, name: true },
  });

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar projects={projects} />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <ProjectSettingsLayout projectId={projectId} projectName={project.name}>
            <MembersSettings
              projectId={projectId}
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
