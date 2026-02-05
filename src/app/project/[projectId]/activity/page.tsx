import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ActivityStream } from "@/components/activity/ActivityStream";
import { isProjectKey } from "@/lib/task-lookup";

interface ActivityPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ActivityPage({ params }: ActivityPageProps) {
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
    select: {
      id: true,
      name: true,
      projectKey: true,
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
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b bg-background px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/project/${project.projectKey}`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Link>
                </Button>
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Activity Stream
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Recent activity in {project.name}
                  </p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              <ActivityStream
                projectId={project.id}
                projectKey={project.projectKey}
                limit={50}
                showHeader={false}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
