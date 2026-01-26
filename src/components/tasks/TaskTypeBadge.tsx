"use client";

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
  bgColor: string;
  textColor: string;
  iconColor: string;
}> = {
  EPIC: {
    label: "Epic",
    icon: Rocket,
    bgColor: "bg-violet-100 dark:bg-violet-900/40",
    textColor: "text-violet-700 dark:text-violet-300",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  STORY: {
    label: "Story",
    icon: BookOpen,
    bgColor: "bg-emerald-100 dark:bg-emerald-900/40",
    textColor: "text-emerald-700 dark:text-emerald-300",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  TASK: {
    label: "Task",
    icon: CheckSquare,
    bgColor: "bg-blue-100 dark:bg-blue-900/40",
    textColor: "text-blue-700 dark:text-blue-300",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  SUBTASK: {
    label: "Subtask",
    icon: ListTodo,
    bgColor: "bg-slate-100 dark:bg-slate-800/60",
    textColor: "text-slate-700 dark:text-slate-300",
    iconColor: "text-slate-600 dark:text-slate-400",
  },
  BUG: {
    label: "Bug",
    icon: Bug,
    bgColor: "bg-red-100 dark:bg-red-900/40",
    textColor: "text-red-700 dark:text-red-300",
    iconColor: "text-red-600 dark:text-red-400",
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
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium transition-colors",
        config.bgColor,
        config.textColor,
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2.5 py-0.5"
      )}
    >
      <Icon
        className={cn(
          config.iconColor,
          size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"
        )}
      />
      {showLabel && config.label}
    </div>
  );
}
