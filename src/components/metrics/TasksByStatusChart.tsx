"use client";

import { TaskStatus } from "@/types";

interface Task {
  id: string;
  status: TaskStatus;
}

interface TasksByStatusChartProps {
  tasks: Task[];
}

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  BACKLOG: { label: "Backlog", color: "bg-slate-400" },
  TODO: { label: "To Do", color: "bg-slate-500" },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-500" },
  GENERATING: { label: "Generating", color: "bg-yellow-500" },
  AWAITING_CODE_REVIEW: { label: "Awaiting Review", color: "bg-amber-500" },
  PR_OPEN: { label: "PR Open", color: "bg-purple-500" },
  IN_REVIEW: { label: "In Review", color: "bg-orange-500" },
  HAS_CONFLICTS: { label: "Has Conflicts", color: "bg-red-500" },
  CHANGES_REQUESTED: { label: "Changes Requested", color: "bg-red-400" },
  APPROVED: { label: "Approved", color: "bg-green-400" },
  MERGED: { label: "Merged", color: "bg-green-500" },
  CLOSED: { label: "Closed", color: "bg-gray-500" },
};

export function TasksByStatusChart({ tasks }: TasksByStatusChartProps) {
  const total = tasks.length;

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No tasks yet
      </p>
    );
  }

  // Count tasks by status
  const counts: Record<TaskStatus, number> = {
    BACKLOG: 0,
    TODO: 0,
    IN_PROGRESS: 0,
    GENERATING: 0,
    AWAITING_CODE_REVIEW: 0,
    PR_OPEN: 0,
    IN_REVIEW: 0,
    HAS_CONFLICTS: 0,
    CHANGES_REQUESTED: 0,
    APPROVED: 0,
    MERGED: 0,
    CLOSED: 0,
  };

  tasks.forEach((task) => {
    counts[task.status]++;
  });

  // Filter to only show statuses with tasks
  const activeStatuses = (Object.keys(counts) as TaskStatus[]).filter(
    (status) => counts[status] > 0
  );

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-4 rounded-full overflow-hidden">
        {activeStatuses.map((status) => {
          const percentage = (counts[status] / total) * 100;
          return (
            <div
              key={status}
              className={`${statusConfig[status].color} transition-all`}
              style={{ width: `${percentage}%` }}
              title={`${statusConfig[status].label}: ${counts[status]}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {activeStatuses.map((status) => (
          <div key={status} className="flex items-center gap-2 text-sm">
            <div
              className={`w-3 h-3 rounded-full ${statusConfig[status].color}`}
            />
            <span className="text-muted-foreground flex-1">
              {statusConfig[status].label}
            </span>
            <span className="font-medium">{counts[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
