"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Task, Comment, Execution, Project, User, Label, TaskType, TaskStatus, TaskPriority } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { TaskTypeBadge } from "./TaskTypeBadge";
import { SubtasksList } from "./SubtasksList";
import { PromptPreview } from "./PromptPreview";
import { ExecutionLogs } from "./ExecutionLogs";
import {
  GitPullRequest,
  ExternalLink,
  Play,
  Sparkles,
  Edit,
  Trash2,
  Loader2,
  Bot,
  Calendar,
  Target,
  User as UserIcon,
  ArrowUp,
  Hash,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";

type TaskWithRelations = Task & {
  project: Project;
  comments: (Comment & { user: User | null })[];
  executions: Execution[];
  assignee?: User | null;
  sprint?: { id: string; name: string; status: string } | null;
  parentTask?: { id: string; title: string; taskType: TaskType; status: TaskStatus } | null;
  subtasks?: {
    id: string;
    title: string;
    taskType: TaskType;
    status: TaskStatus;
    priority: TaskPriority;
    storyPoints: number | null;
    assignee?: { id: string; name: string | null; image: string | null } | null;
  }[];
  labels?: Label[];
};

interface TaskDetailProps {
  task: TaskWithRelations;
}

// Status that indicate the task is actively being processed and needs polling
const ACTIVE_STATUSES = ["GENERATING", "PR_OPEN", "IN_REVIEW", "CHANGES_REQUESTED"];
const POLL_INTERVAL = 5000; // 5 seconds

export function TaskDetail({ task }: TaskDetailProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState(task.generatedPrompt || "");
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Auto-refresh for active tasks to pick up webhook updates
  const shouldPoll = ACTIVE_STATUSES.includes(task.status);

  const refreshData = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!shouldPoll) return;

    const interval = setInterval(() => {
      refreshData();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [shouldPoll, refreshData]);

  // Update prompt state when task changes (from polling)
  useEffect(() => {
    setPrompt(task.generatedPrompt || "");
  }, [task.generatedPrompt]);

  async function handleGeneratePrompt() {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/generate-prompt`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setPrompt(data.prompt);
        setShowPrompt(true);
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to generate prompt");
      }
    } catch (error) {
      console.error("Error generating prompt:", error);
      alert("An error occurred while generating the prompt");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleExecute() {
    setIsExecuting(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/execute`, {
        method: "POST",
      });
      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to start execution");
      }
    } catch (error) {
      console.error("Error starting execution:", error);
      alert("An error occurred while starting the execution");
    } finally {
      setIsExecuting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this task?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.push(`/project/${task.projectId}`);
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("An error occurred while deleting the task");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;

    setIsAddingComment(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      if (response.ok) {
        setNewComment("");
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add comment");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("An error occurred while adding the comment");
    } finally {
      setIsAddingComment(false);
    }
  }

  const canExecute =
    task.generatedPrompt &&
    ["BACKLOG", "TODO", "IN_PROGRESS"].includes(task.status);

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !["MERGED", "CLOSED"].includes(task.status);

  return (
    <div className="space-y-6">
      {/* Parent Task Breadcrumb */}
      {task.parentTask && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowUp className="h-4 w-4" />
          <TaskTypeBadge type={task.parentTask.taskType} size="sm" />
          <Link
            href={`/project/${task.projectId}/task/${task.parentTask.id}`}
            className="hover:underline"
          >
            {task.parentTask.title}
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TaskTypeBadge type={task.taskType} />
            <h1 className="text-2xl font-bold">{task.title}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.storyPoints && (
              <Badge variant="outline" className="gap-1">
                <Hash className="h-3 w-3" />
                {task.storyPoints} pts
              </Badge>
            )}
            {task.prUrl && (
              <a
                href={task.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <GitPullRequest className="h-4 w-4" />
                PR #{task.prNumber}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {task.labels.map((label) => (
                <Badge
                  key={label.id}
                  style={{ backgroundColor: label.color }}
                  className="text-white"
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGeneratePrompt} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {task.generatedPrompt ? "Regenerate Prompt" : "Generate Prompt"}
          </Button>
          {canExecute && (
            <Button size="sm" onClick={handleExecute} disabled={isExecuting}>
              {isExecuting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Execute
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/project/${task.projectId}/task/${task.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Assignment & Details */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Assignee */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <UserIcon className="h-3 w-3" />
                Assignee
              </div>
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {task.assignee.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{task.assignee.name}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
            </div>

            {/* Sprint */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Target className="h-3 w-3" />
                Sprint
              </div>
              {task.sprint ? (
                <Link
                  href={`/project/${task.projectId}/sprint/${task.sprint.id}`}
                  className="text-sm font-medium hover:underline flex items-center gap-1"
                >
                  {task.sprint.name}
                  <Badge variant="secondary" className="text-xs">
                    {task.sprint.status}
                  </Badge>
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">No sprint</span>
              )}
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Due Date
              </div>
              {dueDate ? (
                <span className={`text-sm font-medium ${isOverdue ? "text-destructive" : ""}`}>
                  {format(dueDate, "MMM d, yyyy")}
                  {isOverdue && <span className="ml-1">(Overdue)</span>}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">No due date</span>
              )}
            </div>

            {/* Created */}
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Created</div>
              <span className="text-sm">{formatDateTime(task.createdAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{task.description}</p>
        </CardContent>
      </Card>

      {/* Subtasks */}
      {(task.subtasks || task.taskType === "EPIC" || task.taskType === "STORY" || task.taskType === "TASK") && (
        <Card>
          <CardContent className="pt-6">
            <SubtasksList
              parentTaskId={task.id}
              projectId={task.projectId}
              subtasks={task.subtasks || []}
              parentTaskType={task.taskType}
            />
          </CardContent>
        </Card>
      )}

      {/* Generated Prompt */}
      {task.generatedPrompt && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Generated Prompt
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowPrompt(!showPrompt)}>
              {showPrompt ? "Hide" : "Show"}
            </Button>
          </CardHeader>
          {showPrompt && (
            <CardContent>
              <PromptPreview prompt={prompt} onUpdate={setPrompt} taskId={task.id} />
            </CardContent>
          )}
        </Card>
      )}

      {/* Execution Logs */}
      {task.executions.length > 0 && <ExecutionLogs executions={task.executions} />}

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          ) : (
            <div className="space-y-4">
              {task.comments.map((comment: TaskWithRelations["comments"][number]) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    {comment.user ? (
                      <>
                        <AvatarImage src={comment.user.image || undefined} />
                        <AvatarFallback>{comment.user.name?.charAt(0) || "U"}</AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarFallback>
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {comment.isSystem ? "FlowForge Agent" : comment.user?.name || "Unknown"}
                      </span>
                      {comment.isSystem && <Badge variant="secondary">System</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Separator />
          <div className="space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
            />
            <Button onClick={handleAddComment} disabled={isAddingComment || !newComment.trim()}>
              {isAddingComment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Comment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              <span>{formatDateTime(task.createdAt)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>{" "}
              <span>{formatDateTime(task.updatedAt)}</span>
            </div>
            {task.branchName && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Branch:</span>{" "}
                <code className="bg-muted px-1 py-0.5 rounded">{task.branchName}</code>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
