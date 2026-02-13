"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Building2, Users, FolderKanban, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  async function fetchOrganizations() {
    try {
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setLoading(false);
    }
  }

  function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
    switch (role) {
      case "OWNER":
        return "default";
      case "ADMIN":
        return "secondary";
      default:
        return "outline";
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <div className="flex">
        <Sidebar projects={[]} />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Organizations</h1>
              <p className="text-muted-foreground">Manage your organizations and teams</p>
            </div>
            <Button asChild>
              <Link href="/org/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          ) : organizations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No organizations yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create an organization to collaborate with your team
                </p>
                <Button asChild>
                  <Link href="/org/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Organization
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {organizations.map((org) => (
                <Card key={org.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={org.image || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {org.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base truncate">{org.name}</CardTitle>
                          <Badge variant={getRoleBadgeVariant(org.userRole)} className="shrink-0">
                            {org.userRole}
                          </Badge>
                        </div>
                        <CardDescription className="mt-1">/{org.slug}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {org.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {org.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {org._count.members} members
                      </div>
                      <div className="flex items-center gap-1">
                        <FolderKanban className="h-4 w-4" />
                        {org._count.projects} projects
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" className="flex-1">
                        <Link href={`/org/${org.slug}`}>View</Link>
                      </Button>
                      {(org.userRole === "OWNER" || org.userRole === "ADMIN") && (
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/org/${org.slug}/settings`}>
                            <Settings className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
