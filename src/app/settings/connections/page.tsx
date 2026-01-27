import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Octokit } from "@octokit/rest";
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
      accessToken: true,
      createdAt: true,
      name: true,
      image: true,
    },
  });

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
  });

  // Get count of projects owned
  const ownedProjectsCount = await prisma.project.count({
    where: { userId: session.user.id },
  });

  // Get count of projects as member
  const memberProjectsCount = await prisma.projectMember.count({
    where: { userId: session.user.id },
  });

  // Fetch GitHub user info using the access token
  let githubUsername = user?.githubId || "";
  let githubReposCount = 0;
  let githubAvatarUrl = user?.image || null;
  let githubProfileUrl = "";
  let scopes: string[] = [];

  if (user?.accessToken) {
    try {
      const octokit = new Octokit({ auth: user.accessToken });
      const { data: githubUser } = await octokit.users.getAuthenticated();
      githubUsername = githubUser.login;
      githubReposCount = githubUser.public_repos + (githubUser.total_private_repos || 0);
      githubAvatarUrl = githubUser.avatar_url;
      githubProfileUrl = githubUser.html_url;

      // Get token scopes from response headers
      const response = await octokit.request("GET /user");
      const scopeHeader = response.headers["x-oauth-scopes"];
      if (scopeHeader) {
        scopes = scopeHeader.split(", ").filter(Boolean);
      }
    } catch (error) {
      console.error("Error fetching GitHub user info:", error);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar projects={projects} />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <SettingsLayout>
            <ConnectionsSettings
              githubUsername={githubUsername}
              githubAvatarUrl={githubAvatarUrl}
              githubProfileUrl={githubProfileUrl}
              githubReposCount={githubReposCount}
              connectedAt={user?.createdAt || new Date()}
              ownedProjectsCount={ownedProjectsCount}
              memberProjectsCount={memberProjectsCount}
              scopes={scopes}
            />
          </SettingsLayout>
        </main>
      </div>
    </div>
  );
}
