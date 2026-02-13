"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Github } from "lucide-react";
import type { GitHubRepo } from "@/types";

interface ProjectFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    githubRepo: string;
    defaultBranch: string;
    reviewers: string[];
    agentModel: string;
    projectKey?: string;
  };
}

export function ProjectForm({ mode, initialData }: ProjectFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    githubRepo: initialData?.githubRepo || "",
    defaultBranch: initialData?.defaultBranch || "main",
    reviewers: initialData?.reviewers?.join(", ") || "",
    agentModel: initialData?.agentModel || "gpt-4o",
    projectKey: initialData?.projectKey || "",
  });

  // Auto-generate project key from name
  function generateKeyFromName(name: string): string {
    const words = name.trim().split(/\s+/);
    let key = words
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
    if (key.length < 2) {
      key = name.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase();
    }
    if (key.length < 2) key = "PR";
    return key.substring(0, 10);
  }

  useEffect(() => {
    async function fetchRepos() {
      setIsLoadingRepos(true);
      try {
        const response = await fetch("/api/github/repos");
        if (response.ok) {
          const data = await response.json();
          setRepos(data.repos || []);
        }
      } catch (error) {
        console.error("Failed to fetch repos:", error);
      } finally {
        setIsLoadingRepos(false);
      }
    }
    fetchRepos();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = mode === "create" ? "/api/projects" : `/api/projects/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          githubRepo: formData.githubRepo,
          defaultBranch: formData.defaultBranch,
          agentModel: formData.agentModel,
          reviewers: formData.reviewers.split(",").map((r) => r.trim()).filter(Boolean),
          ...(mode === "create" && formData.projectKey && { projectKey: formData.projectKey }),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/project/${data.project.id}`);
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save project");
      }
    } catch (error) {
      console.error("Error saving project:", error);
      alert("An error occurred while saving the project");
    } finally {
      setIsLoading(false);
    }
  }

  function handleRepoSelect(repoFullName: string) {
    const selectedRepo = repos.find((r) => r.full_name === repoFullName);
    setFormData({
      ...formData,
      githubRepo: repoFullName,
      name: formData.name || selectedRepo?.name || "",
      description: formData.description || selectedRepo?.description || "",
      defaultBranch: selectedRepo?.default_branch || "main",
    });
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Create New Project" : "Edit Project"}</CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Connect a GitHub repository to start automating your development workflow."
            : "Update your project settings."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="githubRepo">GitHub Repository</Label>
            {isLoadingRepos ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading repositories...
              </div>
            ) : (
              <Select value={formData.githubRepo} onValueChange={handleRepoSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a repository" />
                </SelectTrigger>
                <SelectContent>
                  {repos.map((repo) => (
                    <SelectItem key={repo.id} value={repo.full_name}>
                      <div className="flex items-center gap-2">
                        <Github className="h-4 w-4" />
                        {repo.full_name}
                        {repo.private && (
                          <span className="text-xs text-muted-foreground">(private)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                const newName = e.target.value;
                setFormData({
                  ...formData,
                  name: newName,
                  // Auto-generate project key if not manually set (only in create mode)
                  ...(mode === "create" && !formData.projectKey && {
                    projectKey: generateKeyFromName(newName),
                  }),
                });
              }}
              placeholder="My Awesome Project"
              required
            />
          </div>

          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="projectKey">Project Key</Label>
              <Input
                id="projectKey"
                value={formData.projectKey}
                onChange={(e) => setFormData({ ...formData, projectKey: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").substring(0, 10) })}
                placeholder="MP"
                maxLength={10}
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">
                2-10 uppercase letters used for task IDs (e.g., {formData.projectKey || "MP"}-1, {formData.projectKey || "MP"}-2)
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of your project..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultBranch">Default Branch</Label>
            <Input
              id="defaultBranch"
              value={formData.defaultBranch}
              onChange={(e) => setFormData({ ...formData, defaultBranch: e.target.value })}
              placeholder="main"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reviewers">Default Reviewers (optional)</Label>
            <Input
              id="reviewers"
              value={formData.reviewers}
              onChange={(e) => setFormData({ ...formData, reviewers: e.target.value })}
              placeholder="username1, username2"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated GitHub usernames for PR reviewers
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agentModel">AI Model</Label>
            <Select
              value={formData.agentModel}
              onValueChange={(value) => setFormData({ ...formData, agentModel: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading || !formData.githubRepo}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create Project" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
