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
    agentModel: initialData?.agentModel || "claude-sonnet-4-20250514",
  });

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
          ...formData,
          reviewers: formData.reviewers.split(",").map((r) => r.trim()).filter(Boolean),
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
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Awesome Project"
              required
            />
          </div>

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
                <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                <SelectItem value="claude-opus-4-20250514">Claude Opus 4</SelectItem>
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
