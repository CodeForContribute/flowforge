import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ProjectSettingsLayout } from "@/components/settings/ProjectSettingsLayout";
import { CustomFieldsSettings } from "@/components/settings/CustomFieldsSettings";
import { isProjectKey } from "@/lib/task-lookup";

interface CustomFieldsSettingsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function CustomFieldsSettingsPage({ params }: CustomFieldsSettingsPageProps) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

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

  return (
    <ProjectSettingsLayout
      projectId={project.id}
      projectKey={project.projectKey}
      projectName={project.name}
    >
      <CustomFieldsSettings projectId={project.id} />
    </ProjectSettingsLayout>
  );
}
