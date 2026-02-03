import { TaskStatus } from "@/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<TaskStatus, {
  label: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
  isAnimated?: boolean;
}> = {
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
    isAnimated: true,
  },
  GENERATING: {
    label: "Generating",
    dotColor: "bg-gradient-to-r from-violet-500 to-purple-500",
    bgColor: "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30",
    textColor: "text-violet-700 dark:text-violet-300",
    isAnimated: true,
  },
  AWAITING_CODE_REVIEW: {
    label: "Awaiting Review",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-300",
    isAnimated: true,
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
    isAnimated: true,
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

interface StatusBadgeProps {
  status: TaskStatus;
  size?: "sm" | "default";
}

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium transition-colors",
        config.bgColor,
        config.textColor,
        size === "sm" ? "text-[10px] px-2 py-0" : "text-xs"
      )}
    >
      <div
        className={cn(
          "rounded-full",
          config.dotColor,
          config.isAnimated && "animate-pulse-soft",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
        )}
      />
      {config.label}
    </div>
  );
}
