import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { ConnectionsSettings } from "@/components/settings/ConnectionsSettings";

export default async function ConnectionsSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      githubId: true,
      createdAt: true,
    },
  });

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
  });

  // Get count of repos accessible
  const repoCount = await prisma.project.count({
    where: { userId: session.user.id },
  });

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar projects={projects} />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <SettingsLayout>
            <ConnectionsSettings
              githubId={user?.githubId || ""}
              connectedAt={user?.createdAt || new Date()}
              repoCount={repoCount}
            />
          </SettingsLayout>
        </main>
      </div>
    </div>
  );
}
