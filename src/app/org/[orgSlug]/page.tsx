"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Settings, Users, FolderKanban, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  userRole: string;
  _count: {
    members: number;
    projects: number;
  };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  projectKey: string;
  githubRepo: string;
  _count: {
    tasks: number;
  };
}

export default function OrganizationDashboardPage({
  params,
}: {
  params: { orgSlug: string };
}) {
  const { orgSlug } = params;
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = useCallback(async () => {
    try {
      // First, get the org ID from the slug
      const orgsResponse = await fetch("/api/organizations");
      if (!orgsResponse.ok) {
        throw new Error("Failed to fetch organizations");
      }
      const orgsData = await orgsResponse.json();
      const org = orgsData.organizations?.find((o: Organization) => o.slug === orgSlug);

      if (!org) {
        setError("Organization not found");
        setLoading(false);
        return;
      }

      // Get full org details
      const orgResponse = await fetch(`/api/organizations/${org.id}`);
      if (!orgResponse.ok) {
        throw new Error("Failed to fetch organization details");
      }
      const orgData = await orgResponse.json();
      setOrganization(orgData.organization);

      // Get org projects
      const projectsResponse = await fetch(`/api/projects?organizationId=${org.id}`);
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects(projectsData.projects || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navbar />
        <div className="flex">
          <Sidebar projects={[]} />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navbar />
        <div className="flex">
          <Sidebar projects={[]} />
          <main className="flex-1 p-6">
            <Card className="max-w-md mx-auto mt-12">
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
                <CardDescription>{error || "Organization not found"}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  const canManage = organization.userRole === "OWNER" || organization.userRole === "ADMIN";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <div className="flex">
        <Sidebar projects={projects} />
        <main className="flex-1 p-6">
          {/* Organization Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{organization.name}</h1>
                  {organization.description && (
                    <p className="text-muted-foreground mt-1">{organization.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      {organization._count.members} members
                    </Badge>
                    <Badge variant="secondary">
                      <FolderKanban className="h-3 w-3 mr-1" />
                      {organization._count.projects} projects
                    </Badge>
                    <Badge variant="outline">{organization.userRole}</Badge>
                  </div>
                </div>
              </div>
              {canManage && (
                <Button variant="outline" asChild>
                  <Link href={`/org/${orgSlug}/settings`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Projects Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Projects</h2>
              {canManage && (
                <Button asChild>
                  <Link href={`/project/new?organizationId=${organization.id}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Link>
                </Button>
              )}
            </div>

            {projects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first project to get started
                  </p>
                  {canManage && (
                    <Button asChild>
                      <Link href={`/project/new?organizationId=${organization.id}`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Project
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <Card key={project.id} className="hover:shadow-md transition-shadow">
                    <Link href={`/project/${project.projectKey || project.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{project.name}</CardTitle>
                            <CardDescription className="mt-1">
                              {project.projectKey}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary">{project._count.tasks} tasks</Badge>
                        </div>
                      </CardHeader>
                      {project.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {project.description}
                          </p>
                        </CardContent>
                      )}
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
