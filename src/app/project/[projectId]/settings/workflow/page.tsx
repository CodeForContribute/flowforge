import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectSettingsLayout } from "@/components/settings/ProjectSettingsLayout";
import { WorkflowSettings } from "@/components/settings/WorkflowSettings";
import { WorkflowDefinition } from "@/types";

export default async function WorkflowSettingsPage({
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

  // Parse workflow from JSON or use default
  const currentWorkflow = project.workflow
    ? (project.workflow as unknown as WorkflowDefinition)
    : null;

  return (
    <ProjectSettingsLayout
      projectId={params.projectId}
      projectName={project.name}
    >
      <WorkflowSettings
        projectId={params.projectId}
        currentWorkflow={currentWorkflow}
        isOwner={isOwner}
      />
    </ProjectSettingsLayout>
  );
}
