import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MetricsPanel } from "@/components/metrics/MetricsPanel";

interface MetricsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function MetricsPage({ params }: MetricsPageProps) {
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
  });

  if (!project) {
    notFound();
  }

  // Fetch all tasks for metrics
  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: {
      id: true,
      status: true,
      priority: true,
      storyPoints: true,
      dueDate: true,
      assigneeId: true,
    },
  });

  // Fetch sprints with their tasks
  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    include: {
      tasks: {
        select: {
          id: true,
          status: true,
          storyPoints: true,
        },
      },
    },
    orderBy: { startDate: "desc" },
  });

  // Fetch project members
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  // Include project owner as a member
  const owner = await prisma.user.findUnique({
    where: { id: project.userId },
    select: { id: true, name: true },
  });

  const allMembers = owner
    ? [
        {
          id: "owner",
          userId: owner.id,
          user: { name: owner.name },
        },
        ...members.map((m) => ({
          id: m.id,
          userId: m.userId,
          user: { name: m.user.name },
        })),
      ]
    : members.map((m) => ({
        id: m.id,
        userId: m.userId,
        user: { name: m.user.name },
      }));

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
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b bg-background px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/project/${projectId}`}>
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Metrics
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Project overview and statistics
                  </p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <MetricsPanel
              tasks={tasks}
              sprints={sprints}
              members={allMembers}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
