"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings, Github, GitBranch, Users, Bot, Loader2, X } from "lucide-react";

interface GeneralProjectSettingsProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    githubRepo: string;
    defaultBranch: string;
    reviewers: string[];
    agentModel: string;
  };
  isOwner: boolean;
}

export function GeneralProjectSettings({ project, isOwner }: GeneralProjectSettingsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || "",
    defaultBranch: project.defaultBranch,
    reviewers: project.reviewers,
    agentModel: project.agentModel,
  });
  const [newReviewer, setNewReviewer] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update project");
      }
    } catch (error) {
      console.error("Error updating project:", error);
      alert("An error occurred while updating the project");
    } finally {
      setIsLoading(false);
    }
  }

  function addReviewer() {
    if (newReviewer && !formData.reviewers.includes(newReviewer)) {
      setFormData({
        ...formData,
        reviewers: [...formData.reviewers, newReviewer],
      });
      setNewReviewer("");
    }
  }

  function removeReviewer(reviewer: string) {
    setFormData({
      ...formData,
      reviewers: formData.reviewers.filter((r) => r !== reviewer),
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Manage your project's basic information and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isOwner}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your project..."
                rows={3}
                disabled={!isOwner}
              />
            </div>

            {/* GitHub Repo (read-only) */}
            <div className="space-y-2">
              <Label>GitHub Repository</Label>
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4 text-muted-foreground" />
                <Input value={project.githubRepo} disabled className="bg-muted/50" />
              </div>
              <p className="text-xs text-muted-foreground">
                Repository cannot be changed after creation
              </p>
            </div>

            {/* Default Branch */}
            <div className="space-y-2">
              <Label htmlFor="defaultBranch">Default Branch</Label>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="defaultBranch"
                  value={formData.defaultBranch}
                  onChange={(e) => setFormData({ ...formData, defaultBranch: e.target.value })}
                  placeholder="main"
                  disabled={!isOwner}
                />
              </div>
            </div>

            {isOwner && (
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Reviewers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Reviewers
          </CardTitle>
          <CardDescription>
            GitHub usernames that will be requested for PR reviews
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {formData.reviewers.map((reviewer) => (
              <Badge key={reviewer} variant="secondary" className="gap-1 pr-1">
                @{reviewer}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => removeReviewer(reviewer)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
            {formData.reviewers.length === 0 && (
              <p className="text-sm text-muted-foreground">No reviewers configured</p>
            )}
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <Input
                value={newReviewer}
                onChange={(e) => setNewReviewer(e.target.value)}
                placeholder="GitHub username"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addReviewer())}
              />
              <Button type="button" variant="outline" onClick={addReviewer}>
                Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Agent Model */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Agent Configuration
          </CardTitle>
          <CardDescription>
            Configure the AI model used for code generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agentModel">Model</Label>
            <Select
              value={formData.agentModel}
              onValueChange={(value) => setFormData({ ...formData, agentModel: value })}
              disabled={!isOwner}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (Recommended)</SelectItem>
                <SelectItem value="claude-opus-4-20250514">Claude Opus 4</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The AI model affects code quality and generation speed
            </p>
          </div>

          {isOwner && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
