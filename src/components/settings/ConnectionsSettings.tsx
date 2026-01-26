"use client";

import { signOut } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Github, Check, ExternalLink, RefreshCw, FolderGit2 } from "lucide-react";
import { format } from "date-fns";

interface ConnectionsSettingsProps {
  githubId: string;
  connectedAt: Date;
  repoCount: number;
}

export function ConnectionsSettings({ githubId, connectedAt, repoCount }: ConnectionsSettingsProps) {
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
              <div className="h-12 w-12 rounded-xl bg-[#24292e] flex items-center justify-center">
                <Github className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">GitHub</span>
                  <Badge variant="success" className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  @{githubId}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://github.com/${githubId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Profile
              </a>
            </Button>
          </div>

          {/* Connection Details */}
          <div className="grid grid-cols-2 gap-4">
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
                Projects Created
              </div>
              <div className="font-medium">{repoCount} projects</div>
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
            {[
              { name: "Read user profile", description: "Access your public profile information" },
              { name: "Read user email", description: "Access your email addresses" },
              { name: "Repository access", description: "Read and write access to repositories" },
              { name: "Create pull requests", description: "Create and manage pull requests" },
              { name: "Manage branches", description: "Create and delete branches" },
            ].map((permission) => (
              <div
                key={permission.name}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <div>
                  <div className="font-medium text-sm">{permission.name}</div>
                  <div className="text-xs text-muted-foreground">{permission.description}</div>
                </div>
                <Check className="h-4 w-4 text-green-500" />
              </div>
            ))}
          </div>
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
