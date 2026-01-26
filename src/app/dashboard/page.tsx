import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/ProjectCard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: { tasks: true },
      },
      tasks: {
        where: {
          status: {
            in: ["PR_OPEN", "IN_REVIEW", "CHANGES_REQUESTED"],
          },
        },
        select: { id: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your FlowForge projects and tasks
          </p>
        </div>
        <Button asChild>
          <Link href="/project/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No projects yet
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first project to start automating your development workflow.
          </p>
          <Button asChild>
            <Link href="/project/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: typeof projects[number]) => (
            <ProjectCard
              key={project.id}
              project={{
                id: project.id,
                name: project.name,
                description: project.description,
                githubRepo: project.githubRepo,
                taskCount: project._count.tasks,
                activePRCount: project.tasks.length,
                updatedAt: project.updatedAt,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
