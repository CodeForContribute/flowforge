"use client";

import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  BookOpen,
  CheckSquare,
  ListTodo,
  Bug,
} from "lucide-react";
import { TaskType } from "@/types";
import { cn } from "@/lib/utils";

interface TaskTypeBadgeProps {
  type: TaskType;
  size?: "sm" | "default";
  showLabel?: boolean;
}

const typeConfig: Record<TaskType, {
  label: string;
  icon: typeof Rocket;
  color: string;
  bgColor: string;
}> = {
  EPIC: {
    label: "Epic",
    icon: Rocket,
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  STORY: {
    label: "Story",
    icon: BookOpen,
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  TASK: {
    label: "Task",
    icon: CheckSquare,
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  SUBTASK: {
    label: "Subtask",
    icon: ListTodo,
    color: "text-slate-700 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/30",
  },
  BUG: {
    label: "Bug",
    icon: Bug,
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
};

export function TaskTypeBadge({
  type,
  size = "default",
  showLabel = true,
}: TaskTypeBadgeProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-0",
        config.color,
        config.bgColor,
        size === "sm" && "text-xs py-0 px-1"
      )}
    >
      <Icon className={cn("h-3 w-3", size === "sm" && "h-2.5 w-2.5")} />
      {showLabel && config.label}
    </Badge>
  );
}
