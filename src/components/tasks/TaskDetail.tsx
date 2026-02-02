"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Task, Comment, Execution, Project, User, Label, TaskType, TaskStatus, TaskPriority } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { TaskTypeBadge } from "./TaskTypeBadge";
import { SubtasksList } from "./SubtasksList";
import { PromptPreview } from "./PromptPreview";
import { ExecutionLogs } from "./ExecutionLogs";
import { MentionInput, CommentContent } from "./MentionInput";
import { AIEstimateBadge } from "@/components/task";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Clock,
  GitBranch,
  GitMerge,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

type TaskWithRelations = Task & {
  project: Project;
  comments: (Comment & { user: User | null })[];
  executions: Execution[];
  assignee?: { id: string; name: string | null; email: string; image: string | null } | null;
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
  const [isWatching, setIsWatching] = useState(false);
  const [isTogglingWatch, setIsTogglingWatch] = useState(false);

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

  // Check if user is watching this task
  useEffect(() => {
    async function checkWatchStatus() {
      try {
        const response = await fetch(`/api/tasks/${task.id}/watch`);
        if (response.ok) {
          const data = await response.json();
          setIsWatching(data.isWatching);
        }
      } catch (error) {
        console.error("Error checking watch status:", error);
      }
    }
    checkWatchStatus();
  }, [task.id]);

  async function handleToggleWatch() {
    setIsTogglingWatch(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/watch`, {
        method: isWatching ? "DELETE" : "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setIsWatching(data.isWatching);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update watch status");
      }
    } catch (error) {
      console.error("Error toggling watch:", error);
      alert("An error occurred while updating watch status");
    } finally {
      setIsTogglingWatch(false);
    }
  }

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
    <div className="space-y-6 animate-fade-in">
      {/* Parent Task Breadcrumb */}
      {task.parentTask && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <ArrowUp className="h-4 w-4" />
          <TaskTypeBadge type={task.parentTask.taskType} size="sm" />
          <Link
            href={`/project/${task.projectId}/task/${task.parentTask.id}`}
            className="hover:text-primary transition-colors"
          >
            {task.parentTask.title}
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <TaskTypeBadge type={task.taskType} />
            <h1 className="text-2xl font-bold">{task.title}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.storyPoints && (
              <Badge variant="outline" className="gap-1 bg-muted/50">
                <Hash className="h-3 w-3" />
                {task.storyPoints} pts
              </Badge>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <div data-tour-id="ai-estimate-badge">
                  <AIEstimateBadge
                    taskId={task.id}
                    currentStoryPoints={task.storyPoints}
                    onEstimateApplied={() => router.refresh()}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>AI analyzes task complexity, finds similar completed tasks, and suggests story points with confidence levels</p>
              </TooltipContent>
            </Tooltip>
            {task.prUrl && (
              <a
                href={task.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors bg-muted/50 px-2 py-1 rounded-full"
              >
                <GitPullRequest className="h-4 w-4" />
                PR #{task.prNumber}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
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
          <Button variant="outline" size="sm" onClick={handleGeneratePrompt} disabled={isGenerating} data-tour-id="generate-prompt-button">
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {task.generatedPrompt ? "Regenerate" : "Generate Prompt"}
          </Button>
          {canExecute && (
            <Button variant="gradient" size="sm" onClick={handleExecute} disabled={isExecuting} data-tour-id="execute-button">
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
            size="sm"
            onClick={handleToggleWatch}
            disabled={isTogglingWatch}
            className={cn(
              isWatching && "bg-primary/10 text-primary border-primary/30"
            )}
          >
            {isTogglingWatch ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isWatching ? (
              <EyeOff className="mr-2 h-4 w-4" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            {isWatching ? "Watching" : "Watch"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/project/${task.projectId}/task/${task.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDelete} disabled={isDeleting} className="text-destructive hover:text-destructive hover:bg-destructive/10">
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Assignment & Details */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Assignee */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <UserIcon className="h-3 w-3" />
                Assignee
              </div>
              {task.assignee ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                  <Avatar className="h-6 w-6 ring-1 ring-border/50">
                    <AvatarImage src={task.assignee.image || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
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
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Target className="h-3 w-3" />
                Sprint
              </div>
              {task.sprint ? (
                <Link
                  href={`/project/${task.projectId}/sprint/${task.sprint.id}`}
                  className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50"
                >
                  {task.sprint.name}
                  <Badge variant="secondary" className="text-[10px]">
                    {task.sprint.status}
                  </Badge>
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">No sprint</span>
              )}
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Calendar className="h-3 w-3" />
                Due Date
              </div>
              {dueDate ? (
                <div className={cn(
                  "text-sm font-medium p-2 rounded-lg",
                  isOverdue ? "bg-destructive/10 text-destructive" : "bg-muted/30"
                )}>
                  {format(dueDate, "MMM d, yyyy")}
                  {isOverdue && <span className="ml-1 text-xs">(Overdue)</span>}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">No due date</span>
              )}
            </div>

            {/* Created */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Clock className="h-3 w-3" />
                Created
              </div>
              <span className="text-sm p-2 rounded-lg bg-muted/30 block">{formatDateTime(task.createdAt)}</span>
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
          <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{task.description}</p>
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
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
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

      {/* PR Summary Card */}
      {(task.prUrl || task.branchName) && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <GitPullRequest className="h-5 w-5 text-primary" />
              Development Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Branch Info */}
              {task.branchName && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <GitBranch className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Branch</span>
                    <a
                      href={`https://github.com/${task.project.githubRepo}/tree/${task.branchName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm font-mono text-primary hover:underline"
                    >
                      {task.branchName}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* PR Info */}
              {task.prUrl && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <GitPullRequest className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Pull Request</span>
                    <a
                      href={task.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      PR #{task.prNumber}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Status indicator */}
            {task.status === "MERGED" && (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <GitMerge className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Successfully merged into {task.project.defaultBranch}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Execution Logs */}
      {task.executions.length > 0 && <ExecutionLogs executions={task.executions} maxVisible={5} />}

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter out verbose system execution logs, only show user comments and important system messages */}
          {(() => {
            const filteredComments = task.comments.filter(comment => {
              // Always show user comments
              if (!comment.isSystem) return true;
              // Filter out verbose execution logs that pollute the comments
              const content = comment.content.toLowerCase();
              // Skip generic status updates and verbose logs
              if (content.includes('starting execution') ||
                  content.includes('generating code') ||
                  content.includes('creating branch') ||
                  content.includes('committing files') ||
                  content.includes('requesting reviewers') ||
                  content.startsWith('step completed:') ||
                  content.startsWith('execution step:')) {
                return false;
              }
              return true;
            });

            return filteredComments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
            ) : (
              <div className="space-y-4">
                {filteredComments.map((comment: TaskWithRelations["comments"][number]) => (
                <div key={comment.id} className="flex gap-3 group">
                  <div className="relative">
                    <Avatar className="h-8 w-8 ring-2 ring-border/30">
                      {comment.user ? (
                        <>
                          <AvatarImage src={comment.user.image || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {comment.user.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </>
                      ) : (
                        <>
                          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600">
                            <Bot className="h-4 w-4 text-white" />
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                  </div>
                  <div className="flex-1 border-l-2 border-border/50 pl-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {comment.isSystem ? "FlowForge Agent" : comment.user?.name || "Unknown"}
                      </span>
                      {comment.isSystem && <Badge variant="ai" className="text-[10px]">AI</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(comment.createdAt)}
                      </span>
                    </div>
                    <CommentContent content={comment.content} />
                  </div>
                </div>
              ))}
              </div>
            );
          })()}
          <Separator />
          <div className="space-y-2">
            <MentionInput
              value={newComment}
              onChange={setNewComment}
              projectId={task.projectId}
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
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span>{formatDateTime(task.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Updated:</span>
              <span>{formatDateTime(task.updatedAt)}</span>
            </div>
            {task.branchName && (
              <div className="col-span-2 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Branch:</span>
                <a
                  href={`https://github.com/${task.project.githubRepo}/tree/${task.branchName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded text-xs font-mono hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {task.branchName}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
