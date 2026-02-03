"use client";

import { useState } from "react";
import { TaskStatus } from "@/types";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const statusConfig: Record<
  TaskStatus,
  {
    label: string;
    dotColor: string;
    bgColor: string;
    textColor: string;
  }
> = {
  BACKLOG: {
    label: "Backlog",
    dotColor: "bg-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800/50",
    textColor: "text-slate-600 dark:text-slate-400",
  },
  TODO: {
    label: "To Do",
    dotColor: "bg-slate-500",
    bgColor: "bg-slate-100 dark:bg-slate-800/50",
    textColor: "text-slate-700 dark:text-slate-300",
  },
  IN_PROGRESS: {
    label: "In Progress",
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-300",
  },
  GENERATING: {
    label: "Generating",
    dotColor: "bg-gradient-to-r from-violet-500 to-purple-500",
    bgColor: "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30",
    textColor: "text-violet-700 dark:text-violet-300",
  },
  AWAITING_CODE_REVIEW: {
    label: "Awaiting Review",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-300",
  },
  PR_OPEN: {
    label: "PR Open",
    dotColor: "bg-cyan-500",
    bgColor: "bg-cyan-50 dark:bg-cyan-900/30",
    textColor: "text-cyan-700 dark:text-cyan-300",
  },
  IN_REVIEW: {
    label: "In Review",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-300",
  },
  CHANGES_REQUESTED: {
    label: "Changes Requested",
    dotColor: "bg-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-900/30",
    textColor: "text-orange-700 dark:text-orange-300",
  },
  APPROVED: {
    label: "Approved",
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/30",
    textColor: "text-emerald-700 dark:text-emerald-300",
  },
  MERGED: {
    label: "Merged",
    dotColor: "bg-green-500",
    bgColor: "bg-green-50 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-300",
  },
  CLOSED: {
    label: "Closed",
    dotColor: "bg-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800/50",
    textColor: "text-gray-600 dark:text-gray-400",
  },
};

// Define which statuses can be manually set by users
// Some statuses like GENERATING are system-controlled
const MANUAL_STATUSES: TaskStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "PR_OPEN",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "MERGED",
  "CLOSED",
];

interface StatusSelectProps {
  taskId: string;
  currentStatus: TaskStatus;
  onStatusChange?: (newStatus: TaskStatus) => void;
  size?: "sm" | "default";
  disabled?: boolean;
}

export function StatusSelect({
  taskId,
  currentStatus,
  onStatusChange,
  size = "default",
  disabled = false,
}: StatusSelectProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<TaskStatus>(currentStatus);

  async function handleStatusChange(newStatus: TaskStatus) {
    if (newStatus === status) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
      } else {
        const error = await response.json();
        console.error("Failed to update status:", error);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setIsUpdating(false);
    }
  }

  const config = statusConfig[status];

  return (
    <Select
      value={status}
      onValueChange={(value) => handleStatusChange(value as TaskStatus)}
      disabled={disabled || isUpdating}
    >
      <SelectTrigger
        className={cn(
          "border-0 gap-1.5 font-medium transition-colors h-auto",
          config.bgColor,
          config.textColor,
          size === "sm" ? "text-[10px] px-2 py-0.5 rounded-full" : "text-xs px-2.5 py-1 rounded-full",
          isUpdating && "opacity-70"
        )}
      >
        {isUpdating ? (
          <Loader2 className={cn("animate-spin", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
        ) : (
          <div
            className={cn(
              "rounded-full shrink-0",
              config.dotColor,
              size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
            )}
          />
        )}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MANUAL_STATUSES.map((statusOption) => {
          const optionConfig = statusConfig[statusOption];
          return (
            <SelectItem
              key={statusOption}
              value={statusOption}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    optionConfig.dotColor
                  )}
                />
                <span>{optionConfig.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
