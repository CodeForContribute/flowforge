import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MemberList } from "@/components/projects/MemberList";
import { InviteMemberForm } from "@/components/projects/InviteMemberForm";
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
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b bg-background px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/project/${projectId}/settings`}>
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Members
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {allMembers.length} members
                  </p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl space-y-6">
              {isOwner && <InviteMemberForm projectId={projectId} />}

              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Current Members</h2>
                <MemberList
                  members={allMembers}
                  projectId={projectId}
                  currentUserId={session.user.id}
                  isOwner={isOwner}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
