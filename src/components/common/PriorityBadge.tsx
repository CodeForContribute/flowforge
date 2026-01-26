import { TaskPriority } from "@/types";
import { ArrowUp, ArrowDown, Minus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const priorityConfig: Record<TaskPriority, {
  label: string;
  icon: typeof ArrowUp;
  bgColor: string;
  textColor: string;
  iconColor: string;
}> = {
  LOW: {
    label: "Low",
    icon: ArrowDown,
    bgColor: "bg-slate-100 dark:bg-slate-800/50",
    textColor: "text-slate-600 dark:text-slate-400",
    iconColor: "text-slate-500",
  },
  MEDIUM: {
    label: "Medium",
    icon: Minus,
    bgColor: "bg-blue-50 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-300",
    iconColor: "text-blue-500",
  },
  HIGH: {
    label: "High",
    icon: ArrowUp,
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-300",
    iconColor: "text-amber-500",
  },
  URGENT: {
    label: "Urgent",
    icon: AlertTriangle,
    bgColor: "bg-red-50 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-300",
    iconColor: "text-red-500",
  },
};

interface PriorityBadgeProps {
  priority: TaskPriority;
  size?: "sm" | "default";
  showLabel?: boolean;
}

export function PriorityBadge({
  priority,
  size = "default",
  showLabel = true,
}: PriorityBadgeProps) {
  const config = priorityConfig[priority];
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
