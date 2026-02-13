"use client";

import { signOut } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Github, Check, ExternalLink, RefreshCw, FolderGit2, GitFork, Users, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface ConnectionsSettingsProps {
  githubUsername: string;
  githubAvatarUrl: string | null;
  githubProfileUrl: string;
  githubReposCount: number;
  connectedAt: Date;
  ownedProjectsCount: number;
  memberProjectsCount: number;
  scopes: string[];
}

// Standard permissions that FlowForge typically needs
const standardPermissions = [
  { name: "Read user profile", description: "Access your public profile information", scope: "read:user" },
  { name: "Read user email", description: "Access your email addresses", scope: "user:email" },
  { name: "Repository access", description: "Read and write access to repositories", scope: "repo" },
  { name: "Create pull requests", description: "Create and manage pull requests", scope: "repo" },
  { name: "Manage branches", description: "Create and delete branches", scope: "repo" },
];

export function ConnectionsSettings({
  githubUsername,
  githubAvatarUrl,
  githubProfileUrl,
  githubReposCount,
  connectedAt,
  ownedProjectsCount,
  memberProjectsCount,
  scopes,
}: ConnectionsSettingsProps) {
  // Check if a scope is granted (including parent scopes)
  const hasScopeAccess = (requiredScope: string): boolean => {
    if (scopes.includes(requiredScope)) return true;
    // "repo" scope includes access to all repo-related permissions
    if (requiredScope.startsWith("public_repo") && scopes.includes("repo")) return true;
    // If we have the user scope, we have read:user
    if (requiredScope === "read:user" && scopes.includes("user")) return true;
    return scopes.length > 0; // Assume access if we have any scopes (fallback)
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Connected Accounts
          </CardTitle>
          <CardDescription>
            Manage your connected accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* GitHub Connection */}
          <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 ring-2 ring-border">
                {githubAvatarUrl ? (
                  <AvatarImage src={githubAvatarUrl} alt={githubUsername} />
                ) : (
                  <AvatarFallback className="bg-[#24292e]">
                    <Github className="h-6 w-6 text-white" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">GitHub</span>
                  <Badge variant="success" className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  @{githubUsername}
                </p>
              </div>
            </div>
            {githubProfileUrl && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={githubProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Profile
                </a>
              </Button>
            )}
          </div>

          {/* Connection Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <RefreshCw className="h-4 w-4" />
                Connected Since
              </div>
              <div className="font-medium">
                {format(new Date(connectedAt), "MMMM d, yyyy")}
              </div>
            </div>
            <div className="p-4 rounded-xl border bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <FolderGit2 className="h-4 w-4" />
                Projects Owned
              </div>
              <div className="font-medium">{ownedProjectsCount} project{ownedProjectsCount !== 1 ? "s" : ""}</div>
            </div>
            <div className="p-4 rounded-xl border bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Users className="h-4 w-4" />
                Member Of
              </div>
              <div className="font-medium">{memberProjectsCount} project{memberProjectsCount !== 1 ? "s" : ""}</div>
            </div>
            <div className="p-4 rounded-xl border bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <GitFork className="h-4 w-4" />
                GitHub Repos
              </div>
              <div className="font-medium">{githubReposCount} repo{githubReposCount !== 1 ? "s" : ""}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>GitHub Permissions</CardTitle>
          <CardDescription>
            FlowForge has access to the following GitHub permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {standardPermissions.map((permission) => {
              const hasAccess = hasScopeAccess(permission.scope);
              return (
                <div
                  key={permission.name}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div>
                    <div className="font-medium text-sm">{permission.name}</div>
                    <div className="text-xs text-muted-foreground">{permission.description}</div>
                  </div>
                  {hasAccess ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Show actual scopes if available */}
          {scopes.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs text-muted-foreground mb-2">OAuth Scopes Granted:</div>
              <div className="flex flex-wrap gap-1">
                {scopes.map((scope) => (
                  <Badge key={scope} variant="secondary" className="text-xs">
                    {scope}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disconnect */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Disconnect Account</CardTitle>
          <CardDescription>
            Disconnecting your GitHub account will sign you out and remove access to all your projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Disconnect GitHub & Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
