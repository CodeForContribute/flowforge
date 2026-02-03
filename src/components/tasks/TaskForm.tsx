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
import { Separator } from "@/components/ui/separator";
import { Loader2, GitBranch, RefreshCw } from "lucide-react";
import { TaskStatus, TaskPriority, TaskType } from "@/types";
import { AssigneeSelector } from "./AssigneeSelector";
import { DueDatePicker } from "./DueDatePicker";
import { LabelSelector } from "./LabelSelector";
import { StoryPointsInput } from "./StoryPointsInput";
import { SprintSelector } from "@/components/sprints/SprintSelector";

interface TaskFormProps {
  mode: "create" | "edit";
  projectId: string;
  projectKey?: string;
  initialData?: {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    taskType?: TaskType;
    storyPoints?: number | null;
    dueDate?: Date | null;
    assigneeId?: string | null;
    sprintId?: string | null;
    parentTaskId?: string | null;
    taskKey?: string;
    baseBranch?: string | null;
    labels?: { id: string; name: string; color: string }[];
  };
  parentTaskId?: string;
  defaultBranch?: string;
}

export function TaskForm({ mode, projectId, projectKey, initialData, parentTaskId, defaultBranch }: TaskFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    status: initialData?.status || "BACKLOG",
    priority: initialData?.priority || "MEDIUM",
    taskType: initialData?.taskType || "TASK",
    storyPoints: initialData?.storyPoints ?? null,
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : null,
    assigneeId: initialData?.assigneeId ?? null,
    sprintId: initialData?.sprintId ?? null,
    baseBranch: initialData?.baseBranch ?? null,
    labels: initialData?.labels || [],
  });

  // Fetch branches from GitHub
  async function fetchBranches() {
    setIsLoadingBranches(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/branches`);
      if (response.ok) {
        const data = await response.json();
        setBranches(data.branches || []);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setIsLoadingBranches(false);
    }
  }

  useEffect(() => {
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url =
        mode === "create"
          ? "/api/tasks"
          : `/api/tasks/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          taskType: formData.taskType,
          storyPoints: formData.storyPoints,
          dueDate: formData.dueDate?.toISOString() || null,
          assigneeId: formData.assigneeId,
          sprintId: formData.sprintId,
          baseBranch: formData.baseBranch,
          labelIds: formData.labels.map((l) => l.id),
          parentTaskId: parentTaskId || initialData?.parentTaskId,
          projectId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const projectSlug = projectKey || projectId;
        const taskSlug = data.task.taskKey || data.task.id;
        router.push(`/project/${projectSlug}/task/${taskSlug}`);
        router.refresh();
      } else {
        const errorData = await response.json();
        const errorMessage = typeof errorData.error === "string"
          ? errorData.error
          : Array.isArray(errorData.error)
            ? errorData.error.map((e: { message?: string }) => e.message || String(e)).join(", ")
            : "Failed to save task";
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error saving task:", error);
      alert("An error occurred while saving the task");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Create New Task" : "Edit Task"}</CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Define a task for the AI agent to implement."
            : "Update the task details."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Add user authentication"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the task in detail. Include acceptance criteria, technical requirements, and any relevant context..."
              rows={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              Be specific and detailed. The AI will use this to generate implementation code.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taskType">Type</Label>
              <Select
                value={formData.taskType}
                onValueChange={(value) =>
                  setFormData({ ...formData, taskType: value as TaskType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EPIC">Epic</SelectItem>
                  <SelectItem value="STORY">Story</SelectItem>
                  <SelectItem value="TASK">Task</SelectItem>
                  <SelectItem value="SUBTASK">Subtask</SelectItem>
                  <SelectItem value="BUG">Bug</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value as TaskPriority })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as TaskStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BACKLOG">Backlog</SelectItem>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Story Points</Label>
              <StoryPointsInput
                value={formData.storyPoints}
                onChange={(value) => setFormData({ ...formData, storyPoints: value })}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Assignment</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assignee</Label>
                <AssigneeSelector
                  projectId={projectId}
                  value={formData.assigneeId}
                  onChange={(value) => setFormData({ ...formData, assigneeId: value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Sprint</Label>
                <SprintSelector
                  projectId={projectId}
                  value={formData.sprintId}
                  onChange={(value) => setFormData({ ...formData, sprintId: value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <DueDatePicker
                value={formData.dueDate}
                onChange={(value) => setFormData({ ...formData, dueDate: value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Labels</Label>
              <LabelSelector
                projectId={projectId}
                value={formData.labels}
                onChange={(value) => setFormData({ ...formData, labels: value })}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Git Configuration</h3>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Base Branch for PR
              </Label>
              <div className="flex gap-2">
                <Select
                  value={formData.baseBranch || "_default_"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, baseBranch: value === "_default_" ? null : value })
                  }
                  disabled={isLoadingBranches}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Use project default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_default_">
                      Use project default ({defaultBranch || "main"})
                    </SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={fetchBranches}
                  disabled={isLoadingBranches}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingBranches ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isLoadingBranches
                  ? "Loading branches..."
                  : branches.length > 0
                    ? `${branches.length} branches available. Select a branch or use project default.`
                    : "Could not load branches. Using project default."}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create Task" : "Save Changes"}
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
