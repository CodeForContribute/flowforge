import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, FolderKanban } from "lucide-react";
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
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-8" data-tour-id="dashboard-header">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your FlowForge projects and tasks
          </p>
        </div>
        <Button asChild variant="gradient" className="shadow-lg shadow-primary/20" data-tour-id="new-project-button">
          <Link href="/project/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 animate-fade-up">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-6">
            <FolderKanban className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No projects yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Create your first project to start automating your development workflow with AI.
          </p>
          <Button asChild variant="gradient" size="lg" className="shadow-lg shadow-primary/20">
            <Link href="/project/new">
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Project
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: typeof projects[number], index: number) => (
            <div
              key={project.id}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ProjectCard
                project={{
                  id: project.id,
                  name: project.name,
                  description: project.description,
                  githubRepo: project.githubRepo,
                  projectKey: project.projectKey,
                  taskCount: project._count.tasks,
                  activePRCount: project.tasks.length,
                  updatedAt: project.updatedAt,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
