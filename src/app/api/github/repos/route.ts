import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Octokit } from "@octokit/rest";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const octokit = new Octokit({
      auth: session.user.accessToken,
    });

    // Fetch user's repositories (including private ones they have access to)
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
      affiliation: "owner,collaborator,organization_member",
    });

    const formattedRepos = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      private: repo.private,
      default_branch: repo.default_branch,
      html_url: repo.html_url,
    }));

    return NextResponse.json({ repos: formattedRepos });
  } catch (error) {
    console.error("Error fetching GitHub repos:", error);
    return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
  }
}
