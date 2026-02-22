"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TaskTypeBadge } from "./TaskTypeBadge";
import { AIEstimateBadge } from "@/components/task";
import { GitPullRequest, MessageSquare, GripVertical, Calendar, Layers, CheckCircle2, Circle } from "lucide-react";
import { TaskPriority, TaskType, TaskStatus } from "@/types";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";

interface Subtask {
  id: string;
  title: string;
  status: TaskStatus;
  taskKey?: string;
}

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    taskType?: TaskType;
    storyPoints?: number | null;
    dueDate?: Date | string | null;
    taskKey?: string;
    prNumber: number | null;
    prUrl: string | null;
    projectId: string;
    assignee?: {
      id: string;
      name: string | null;
      image: string | null;
    } | null;
    labels?: { id: string; name: string; color: string }[];
    subtasks?: Subtask[];
    _count?: {
      comments: number;
      subtasks?: number;
    };
  };
  projectKey?: string;
  aiEnabled?: boolean;
}

const priorityColors: Record<TaskPriority, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-amber-500",
  URGENT: "bg-red-500",
};

export function TaskCard({ task, projectKey, aiEnabled }: TaskCardProps) {
  const router = useRouter();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
  const taskUrl = `/project/${projectKey || task.projectId}/task/${task.taskKey || task.id}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group transition-all duration-200",
        isDragging && "opacity-50 scale-105 rotate-2 z-50"
      )}
      data-testid={`task-card-${task.id}`}
      data-tour-id="task-card"
    >
      <Card
        className={cn(
          "relative overflow-hidden transition-all duration-200",
          "bg-card hover:bg-accent/50 dark:hover:bg-accent/30",
          "border border-border/60 hover:border-primary/50",
          "hover:shadow-md hover:shadow-primary/5",
          isOverdue && "border-l-2 border-l-destructive",
          (task.status === "MERGED" || task.status === "CLOSED") && "opacity-60"
        )}
      >
        {/* Priority indicator bar */}
        <div className={cn("absolute top-0 left-0 w-1 h-full", priorityColors[task.priority])} />

        <div className="p-3 pl-4">
          {/* Top row: Drag handle, Task Key, Type Icon */}
          <div className="flex items-center gap-2 mb-2">
            <button
              className="cursor-grab touch-none opacity-0 group-hover:opacity-100 transition-opacity -ml-1"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/50" />
            </button>

            {task.taskKey && (
              <Link
                href={taskUrl}
                className="text-xs font-mono font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                {task.taskKey}
              </Link>
            )}

            {task.taskType && (
              <TaskTypeBadge type={task.taskType} size="sm" showLabel={false} />
            )}

            <div className="flex-1" />

            {task.assignee && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-6 w-6 ring-2 ring-background">
                    <AvatarImage src={task.assignee.image || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                      {task.assignee.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{task.assignee.name || "Unassigned"}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Title */}
          <Link
            href={taskUrl}
            className={cn(
              "block text-sm font-medium leading-snug hover:text-primary transition-colors",
              (task.status === "MERGED" || task.status === "CLOSED") &&
                "line-through text-muted-foreground",
              task.subtasks && task.subtasks.length > 0 ? "mb-2" : "mb-2"
            )}
          >
            {task.title}
          </Link>

          {/* Subtasks List */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="mb-3 pl-1 space-y-1">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Subtasks ({task.subtasks.filter(s => s.status === "MERGED" || s.status === "CLOSED").length}/{task.subtasks.length})
              </div>
              {task.subtasks.slice(0, 4).map((subtask) => {
                const isComplete = subtask.status === "MERGED" || subtask.status === "CLOSED";
                const subtaskUrl = `/project/${projectKey || task.projectId}/task/${subtask.taskKey || subtask.id}`;
                return (
                  <Link
                    key={subtask.id}
                    href={subtaskUrl}
                    className={cn(
                      "flex items-center gap-1.5 text-xs hover:text-primary transition-colors group/subtask",
                      isComplete && "text-muted-foreground"
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                    )}
                    <span className={cn(
                      "truncate",
                      isComplete && "line-through"
                    )}>
                      {subtask.taskKey && (
                        <span className="font-mono text-[10px] text-primary/70 mr-1">{subtask.taskKey}</span>
                      )}
                      {subtask.title}
                    </span>
                  </Link>
                );
              })}
              {task.subtasks.length > 4 && (
                <Link
                  href={taskUrl}
                  className="text-[10px] text-muted-foreground hover:text-primary transition-colors pl-4"
                >
                  +{task.subtasks.length - 4} more
                </Link>
              )}
            </div>
          )}

          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {task.labels.slice(0, 3).map((label) => (
                <span
                  key={label.id}
                  style={{ backgroundColor: `${label.color}20`, color: label.color, borderColor: `${label.color}40` }}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                >
                  {label.name}
                </span>
              ))}
              {task.labels.length > 3 && (
                <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">
                  +{task.labels.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Bottom row: Metadata */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {/* Story Points */}
            {task.storyPoints ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 font-medium">
                    <Layers className="h-3 w-3" />
                    {task.storyPoints}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{task.storyPoints} story points</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <AIEstimateBadge
                taskId={task.id}
                currentStoryPoints={task.storyPoints ?? null}
                compact={true}
                aiEnabled={aiEnabled}
                onEstimateApplied={() => router.refresh()}
              />
            )}

            {/* Due Date */}
            {dueDate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "flex items-center gap-1",
                      isOverdue && "text-destructive font-medium"
                    )}
                  >
                    <Calendar className="h-3 w-3" />
                    {format(dueDate, "MMM d")}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Due {format(dueDate, "MMMM d, yyyy")}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* PR Link */}
            {task.prUrl && (
              <a
                href={task.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <GitPullRequest className="h-3 w-3" />
                #{task.prNumber}
              </a>
            )}

            {/* Comments */}
            {task._count && task._count.comments > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {task._count.comments}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{task._count.comments} comment{task._count.comments > 1 ? 's' : ''}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
