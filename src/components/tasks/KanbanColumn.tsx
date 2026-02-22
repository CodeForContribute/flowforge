"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import { TaskStatus, TaskPriority } from "@/types";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints?: number | null;
  prNumber: number | null;
  prUrl: string | null;
  projectId: string;
  _count?: {
    comments: number;
  };
}

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  projectKey: string;
  wipLimit?: number;
  compact?: boolean;
  aiEnabled?: boolean;
}

const columnStyles: Record<TaskStatus, {
  dotColor: string;
  bgColor: string;
}> = {
  BACKLOG: {
    dotColor: "bg-slate-400",
    bgColor: "bg-slate-50/50 dark:bg-slate-900/20",
  },
  TODO: {
    dotColor: "bg-slate-500",
    bgColor: "bg-slate-50/50 dark:bg-slate-900/20",
  },
  IN_PROGRESS: {
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-50/30 dark:bg-blue-900/10",
  },
  GENERATING: {
    dotColor: "bg-violet-500",
    bgColor: "bg-violet-50/30 dark:bg-violet-900/10",
  },
  AWAITING_CODE_REVIEW: {
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50/30 dark:bg-amber-900/10",
  },
  PR_OPEN: {
    dotColor: "bg-cyan-500",
    bgColor: "bg-cyan-50/30 dark:bg-cyan-900/10",
  },
  IN_REVIEW: {
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50/30 dark:bg-amber-900/10",
  },
  CHANGES_REQUESTED: {
    dotColor: "bg-orange-500",
    bgColor: "bg-orange-50/30 dark:bg-orange-900/10",
  },
  HAS_CONFLICTS: {
    dotColor: "bg-red-500",
    bgColor: "bg-red-50/30 dark:bg-red-900/10",
  },
  APPROVED: {
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-50/30 dark:bg-emerald-900/10",
  },
  MERGED: {
    dotColor: "bg-green-500",
    bgColor: "bg-green-50/30 dark:bg-green-900/10",
  },
  CLOSED: {
    dotColor: "bg-gray-400",
    bgColor: "bg-gray-50/50 dark:bg-gray-900/20",
  },
};

export function KanbanColumn({ id, title, tasks, projectKey, wipLimit, compact = false, aiEnabled }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const style = columnStyles[id] || columnStyles.BACKLOG;
  const isOverLimit = wipLimit !== undefined && wipLimit > 0 && tasks.length > wipLimit;
  const isAtLimit = wipLimit !== undefined && wipLimit > 0 && tasks.length === wipLimit;

  return (
    <div
      className={cn(
        "flex flex-col transition-all duration-300 min-w-[250px]",
        compact ? "min-h-[150px]" : "h-full"
      )}
      data-testid={`column-${id}`}
    >
      <div className={cn(
        "flex items-center justify-between px-2",
        compact ? "py-2" : "py-3"
      )}>
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", style.dotColor)} />
          <h3 className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>{title}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full min-w-[24px] text-center transition-colors",
              isOverLimit
                ? "bg-destructive/20 text-destructive dark:bg-destructive/30"
                : isAtLimit
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                : "bg-muted/80 text-muted-foreground"
            )}
          >
            {tasks.length}
            {wipLimit !== undefined && wipLimit > 0 && (
              <span className="opacity-60">/{wipLimit}</span>
            )}
          </span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2 rounded-xl overflow-y-auto transition-all duration-200",
          style.bgColor,
          isOver && "ring-2 ring-primary/50 ring-dashed bg-primary/5",
          isOverLimit && "ring-2 ring-destructive/50",
          compact && "max-h-[300px]"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} projectKey={projectKey} aiEnabled={aiEnabled} />
            ))}
            {tasks.length === 0 && (
              <div className={cn(
                "text-center text-sm text-muted-foreground",
                compact ? "py-4" : "py-8"
              )}>
                <p className="opacity-60">No tasks</p>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
