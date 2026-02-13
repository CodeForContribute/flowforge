import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectSettingsLayout } from "@/components/settings/ProjectSettingsLayout";
import { AutomationSettings } from "@/components/settings/AutomationSettings";
import { AutomationRule } from "@/types";

export default async function AutomationSettingsPage({
  params,
}: {
  params: { projectId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      members: {
        where: { userId: session.user.id },
        include: { user: { select: { id: true, name: true } } },
      },
      labels: { select: { id: true, name: true, color: true } },
      sprints: {
        where: { status: { in: ["PLANNING", "ACTIVE"] } },
        select: { id: true, name: true },
      },
    },
  });

  if (!project) {
    redirect("/dashboard");
  }

  const isOwner = project.userId === session.user.id;
  const isMember = project.members.length > 0;

  if (!isOwner && !isMember) {
    redirect("/dashboard");
  }

  // Get all project members for action configs
  const allMembers = await prisma.user.findMany({
    where: {
      OR: [
        ...(project.userId ? [{ id: project.userId }] : []),
        { memberships: { some: { projectId: project.id } } },
        // TODO: For org projects, include org members
      ],
    },
    select: { id: true, name: true },
  });

  // Parse automation rules from JSON
  const currentRules = project.automationRules
    ? (project.automationRules as unknown as AutomationRule[])
    : [];

  return (
    <ProjectSettingsLayout
      projectId={params.projectId}
      projectName={project.name}
    >
      <AutomationSettings
        projectId={params.projectId}
        currentRules={currentRules}
        members={allMembers}
        labels={project.labels}
        sprints={project.sprints}
        isOwner={isOwner}
      />
    </ProjectSettingsLayout>
  );
}
