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
import { StatusSelect } from "@/components/common/StatusSelect";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { TaskTypeBadge } from "./TaskTypeBadge";
import { SubtasksList } from "./SubtasksList";
import { PromptPreview } from "./PromptPreview";
import { ExecutionLogs } from "./ExecutionLogs";
import { CommentsSection } from "./CommentsSection";
import { CodeReviewPanel } from "./CodeReviewPanel";
import { AIEstimateBadge } from "@/components/task";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  GitBranch,
  GitMerge,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Layers,
  FileText,
  Activity,
  CircleDot,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TaskWithRelations = Task & {
  project: Project;
  comments: {
    id: string;
    content: string;
    type?: string;
    isSystem: boolean;
    metadata?: unknown;
    createdAt: Date;
    updatedAt?: Date;
    userId: string | null;
    user: User | null;
    reactions?: {
      id: string;
      emoji: string;
      userId: string;
      user: { id: string; name: string | null; image: string | null };
    }[];
  }[];
  executions: Execution[];
  assignee?: { id: string; name: string | null; email: string; image: string | null } | null;
  sprint?: { id: string; name: string; status: string } | null;
  parentTask?: { id: string; title: string; taskType: TaskType; status: TaskStatus; taskKey?: string } | null;
  subtasks?: {
    id: string;
    title: string;
    taskType: TaskType;
    status: TaskStatus;
    priority: TaskPriority;
    storyPoints: number | null;
    taskKey?: string;
    assignee?: { id: string; name: string | null; image: string | null } | null;
  }[];
  labels?: Label[];
};

interface TaskDetailProps {
  task: TaskWithRelations;
  currentUserId: string;
}

const priorityColors: Record<TaskPriority, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-amber-500",
  URGENT: "bg-red-500",
};

const priorityGradients: Record<TaskPriority, string> = {
  LOW: "from-slate-400/20 to-transparent",
  MEDIUM: "from-blue-500/20 to-transparent",
  HIGH: "from-amber-500/20 to-transparent",
  URGENT: "from-red-500/20 to-transparent",
};

// Status that indicate the task is actively being processed and needs polling
const ACTIVE_STATUSES = ["GENERATING", "AWAITING_CODE_REVIEW", "PR_OPEN", "IN_REVIEW", "CHANGES_REQUESTED"];
const POLL_INTERVAL = 5000;

export function TaskDetail({ task, currentUserId }: TaskDetailProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState(task.generatedPrompt || "");
  const [isWatching, setIsWatching] = useState(false);
  const [isTogglingWatch, setIsTogglingWatch] = useState(false);
  const [showExecutionLogs, setShowExecutionLogs] = useState(false);

  // Auto-refresh for active tasks
  const shouldPoll = ACTIVE_STATUSES.includes(task.status);

  const refreshData = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!shouldPoll) return;
    const interval = setInterval(() => refreshData(), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [shouldPoll, refreshData]);

  useEffect(() => {
    setPrompt(task.generatedPrompt || "");
  }, [task.generatedPrompt]);

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

  const canExecute =
    task.generatedPrompt &&
    ["BACKLOG", "TODO", "IN_PROGRESS"].includes(task.status);

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !["MERGED", "CLOSED"].includes(task.status);

  return (
    <div className="animate-fade-in">
      {/* Parent Task Breadcrumb */}
      {task.parentTask && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <ArrowUp className="h-4 w-4 text-muted-foreground" />
          <TaskTypeBadge type={task.parentTask.taskType} size="sm" />
          {task.parentTask.taskKey && (
            <Link
              href={`/project/${task.project.projectKey || task.projectId}/task/${task.parentTask.taskKey || task.parentTask.id}`}
              className="font-mono text-xs text-primary hover:underline"
            >
              {task.parentTask.taskKey}
            </Link>
          )}
          <Link
            href={`/project/${task.project.projectKey || task.projectId}/task/${task.parentTask.taskKey || task.parentTask.id}`}
            className="text-muted-foreground hover:text-foreground transition-colors truncate"
          >
            {task.parentTask.title}
          </Link>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card className="relative overflow-hidden">
            {/* Priority gradient background */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-r opacity-50",
              priorityGradients[task.priority]
            )} />
            {/* Priority indicator bar */}
            <div className={cn("absolute top-0 left-0 w-1 h-full", priorityColors[task.priority])} />

            <CardContent className="relative pt-6 pl-6">
              <div className="space-y-4">
                {/* Type and Key */}
                <div className="flex items-center gap-3 flex-wrap">
                  <TaskTypeBadge type={task.taskType} />
                  {task.taskKey && (
                    <Link
                      href={`/project/${task.project.projectKey}/task/${task.taskKey}`}
                      className="text-sm font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-md hover:bg-primary/20 transition-colors"
                    >
                      {task.taskKey}
                    </Link>
                  )}
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                  {task.storyPoints && (
                    <Badge variant="outline" className="gap-1 bg-background/50">
                      <Layers className="h-3 w-3" />
                      {task.storyPoints} pts
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold leading-tight">{task.title}</h1>

                {/* Labels */}
                {task.labels && task.labels.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {task.labels.map((label) => (
                      <span
                        key={label.id}
                        style={{ backgroundColor: `${label.color}20`, color: label.color, borderColor: `${label.color}40` }}
                        className="text-xs font-medium px-2.5 py-1 rounded-full border"
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* PR Badge */}
                {task.prUrl && (
                  <a
                    href={task.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-500/20 transition-colors"
                  >
                    <GitPullRequest className="h-4 w-4" />
                    Pull Request #{task.prNumber}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {task.description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          {/* Code Review Panel */}
          {task.status === "AWAITING_CODE_REVIEW" && (
            <CodeReviewPanel taskId={task.id} />
          )}

          {/* Subtasks */}
          {(task.subtasks || task.taskType === "EPIC" || task.taskType === "STORY" || task.taskType === "TASK") && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  Subtasks
                  {task.subtasks && task.subtasks.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {task.subtasks.filter(s => s.status === "MERGED" || s.status === "CLOSED").length}/{task.subtasks.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SubtasksList
                  parentTaskId={task.id}
                  projectId={task.projectId}
                  projectKey={task.project.projectKey}
                  subtasks={task.subtasks || []}
                  parentTaskType={task.taskType}
                />
              </CardContent>
            </Card>
          )}

          {/* Generated Prompt */}
          {task.generatedPrompt && (
            <Collapsible open={showPrompt} onOpenChange={setShowPrompt}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <Bot className="h-3.5 w-3.5 text-white" />
                        </div>
                        Generated Prompt
                      </div>
                      {showPrompt ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <PromptPreview prompt={prompt} onUpdate={setPrompt} taskId={task.id} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Development Summary */}
          {(task.prUrl || task.branchName) && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Development
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.branchName && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Branch</span>
                    </div>
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
                )}
                {task.prUrl && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Pull Request</span>
                    </div>
                    <a
                      href={task.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      #{task.prNumber}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {task.status === "MERGED" && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <GitMerge className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      Merged into {task.project.defaultBranch}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Execution Logs */}
          {task.executions.length > 0 && (
            <Collapsible open={showExecutionLogs} onOpenChange={setShowExecutionLogs}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        Execution History
                        <Badge variant="secondary" className="ml-1">{task.executions.length}</Badge>
                      </div>
                      {showExecutionLogs ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <ExecutionLogs executions={task.executions} maxVisible={5} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Comments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Comments
                {task.comments.length > 0 && (
                  <Badge variant="secondary">{task.comments.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CommentsSection
                taskId={task.id}
                projectId={task.projectId}
                comments={task.comments}
                currentUserId={currentUserId}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4">
          {/* Actions Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleGeneratePrompt}
                disabled={isGenerating}
                data-tour-id="generate-prompt-button"
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {task.generatedPrompt ? "Regenerate Prompt" : "Generate Prompt"}
              </Button>

              {canExecute && (
                <Button
                  variant="gradient"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleExecute}
                  disabled={isExecuting}
                  data-tour-id="execute-button"
                >
                  {isExecuting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Execute Task
                </Button>
              )}

              <Separator className="my-2" />

              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full justify-start",
                  isWatching && "bg-primary/10 text-primary border-primary/30"
                )}
                onClick={handleToggleWatch}
                disabled={isTogglingWatch}
              >
                {isTogglingWatch ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isWatching ? (
                  <EyeOff className="mr-2 h-4 w-4" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                {isWatching ? "Unwatch" : "Watch"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => router.push(`/project/${task.project.projectKey || task.projectId}/task/${task.taskKey || task.id}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Task
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete Task
              </Button>
            </CardContent>
          </Card>

          {/* AI Estimate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                AI Estimate
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                  <p>AI analyzes task complexity and suggests story points</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CircleDot className="h-3 w-3" />
                  Status
                </div>
                <StatusSelect
                  taskId={task.id}
                  currentStatus={task.status}
                  onStatusChange={() => router.refresh()}
                />
              </div>

              <Separator />

              {/* Assignee */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserIcon className="h-3 w-3" />
                  Assignee
                </div>
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
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

              <Separator />

              {/* Sprint */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Target className="h-3 w-3" />
                  Sprint
                </div>
                {task.sprint ? (
                  <Link
                    href={`/project/${task.project.projectKey || task.projectId}/sprint/${task.sprint.id}`}
                    className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2"
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

              <Separator />

              {/* Due Date */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Due Date
                </div>
                {dueDate ? (
                  <div className={cn(
                    "text-sm font-medium",
                    isOverdue && "text-destructive"
                  )}>
                    {format(dueDate, "MMM d, yyyy")}
                    {isOverdue && <span className="ml-1 text-xs">(Overdue)</span>}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No due date</span>
                )}
              </div>

              <Separator />

              {/* Story Points */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Hash className="h-3 w-3" />
                  Story Points
                </div>
                <span className="text-sm font-medium">
                  {task.storyPoints ?? "Not estimated"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Timestamps Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDateTime(task.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatDateTime(task.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
