"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { TaskTypeBadge } from "./TaskTypeBadge";
import { GitPullRequest, MessageSquare, GripVertical, Calendar, Hash } from "lucide-react";
import { TaskPriority, TaskType } from "@/types";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string;
    priority: TaskPriority;
    taskType?: TaskType;
    storyPoints?: number | null;
    dueDate?: Date | string | null;
    prNumber: number | null;
    prUrl: string | null;
    projectId: string;
    assignee?: {
      id: string;
      name: string | null;
      image: string | null;
    } | null;
    labels?: { id: string; name: string; color: string }[];
    _count?: {
      comments: number;
      subtasks?: number;
    };
  };
}

export function TaskCard({ task }: TaskCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group transition-all duration-200",
        isDragging && "opacity-50 scale-105 rotate-2 z-50"
      )}
      data-testid={`task-card-${task.id}`}
    >
      <Card
        className={cn(
          "relative overflow-hidden transition-all duration-200",
          "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5",
          "before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-gradient-to-r before:from-transparent before:via-primary/0 before:to-transparent before:transition-all",
          "hover:before:via-primary/60",
          isOverdue && "border-destructive/50 bg-destructive/5"
        )}
      >
        <CardHeader className="p-3 pb-0">
          <div className="flex items-start gap-2">
            <button
              className="mt-0.5 cursor-grab touch-none opacity-0 group-hover:opacity-100 transition-opacity"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {task.taskType && (
                  <TaskTypeBadge type={task.taskType} size="sm" showLabel={false} />
                )}
                <Link
                  href={`/project/${task.projectId}/task/${task.id}`}
                  className="font-medium text-sm hover:text-primary transition-colors truncate"
                >
                  {task.title}
                </Link>
              </div>
              {task.labels && task.labels.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {task.labels.slice(0, 2).map((label) => (
                    <Badge
                      key={label.id}
                      style={{ backgroundColor: label.color }}
                      className="text-white text-[10px] px-1.5 py-0 rounded-full"
                    >
                      {label.name}
                    </Badge>
                  ))}
                  {task.labels.length > 2 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      +{task.labels.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PriorityBadge priority={task.priority} size="sm" />
              {task.storyPoints && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                  <Hash className="h-3 w-3" />
                  {task.storyPoints}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {dueDate && (
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full",
                    isOverdue
                      ? "text-destructive bg-destructive/10"
                      : "text-muted-foreground bg-muted/50"
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  {format(dueDate, "MMM d")}
                </span>
              )}
              {task.prUrl && (
                <a
                  href={task.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GitPullRequest className="h-3 w-3" />
                  #{task.prNumber}
                </a>
              )}
              {task._count && task._count.comments > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  {task._count.comments}
                </span>
              )}
              {task.assignee && (
                <Avatar className="h-5 w-5 ring-1 ring-border/50">
                  <AvatarImage src={task.assignee.image || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {task.assignee.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
