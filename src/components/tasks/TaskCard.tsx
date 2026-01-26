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
      className={cn(isDragging && "opacity-50")}
    >
      <Card className={cn(
        "hover:shadow-md transition-shadow",
        isOverdue && "border-destructive"
      )}>
        <CardHeader className="p-3 pb-0">
          <div className="flex items-start gap-2">
            <button
              className="mt-0.5 cursor-grab touch-none"
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
                  className="font-medium text-sm hover:underline truncate"
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
                      className="text-white text-[10px] px-1 py-0"
                    >
                      {label.name}
                    </Badge>
                  ))}
                  {task.labels.length > 2 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
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
              <PriorityBadge priority={task.priority} />
              {task.storyPoints && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Hash className="h-3 w-3" />
                  {task.storyPoints}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {dueDate && (
                <span className={cn(
                  "flex items-center gap-1 text-xs",
                  isOverdue ? "text-destructive" : "text-muted-foreground"
                )}>
                  <Calendar className="h-3 w-3" />
                  {format(dueDate, "MMM d")}
                </span>
              )}
              {task.prUrl && (
                <a
                  href={task.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
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
                <Avatar className="h-5 w-5">
                  <AvatarImage src={task.assignee.image || undefined} />
                  <AvatarFallback className="text-[10px]">
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
