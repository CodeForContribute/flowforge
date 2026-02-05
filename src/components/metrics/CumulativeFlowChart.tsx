"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";
import { TaskStatus } from "@/types";
import { format, subDays, eachDayOfInterval, startOfDay, isBefore, isAfter, isSameDay } from "date-fns";

interface Task {
  id: string;
  status: TaskStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface CumulativeFlowChartProps {
  tasks: Task[];
  days?: number;
}

// Status groups for CFD (simplified view)
const STATUS_GROUPS = [
  { key: "done", label: "Done", color: "#22c55e", statuses: ["MERGED", "CLOSED"] },
  { key: "review", label: "In Review", color: "#a855f7", statuses: ["PR_OPEN", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED", "AWAITING_CODE_REVIEW"] },
  { key: "inProgress", label: "In Progress", color: "#f59e0b", statuses: ["IN_PROGRESS", "GENERATING", "HAS_CONFLICTS"] },
  { key: "todo", label: "To Do", color: "#3b82f6", statuses: ["TODO"] },
  { key: "backlog", label: "Backlog", color: "#6b7280", statuses: ["BACKLOG"] },
];

export function CumulativeFlowChart({ tasks, days = 30 }: CumulativeFlowChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const startDate = subDays(now, days);
    const dateRange = eachDayOfInterval({ start: startDate, end: now });

    // For each day, count tasks in each status group
    // Since we don't have historical status data, we approximate:
    // - A task is in "backlog/todo" if it was created before that day and status is still backlog/todo
    // - For other statuses, we assume tasks move through linearly based on updatedAt
    return dateRange.map((date) => {
      const dayStart = startOfDay(date);

      // Count tasks that existed on this day (created before or on this day)
      const existingTasks = tasks.filter((t) => {
        const createdAt = new Date(t.createdAt);
        return isBefore(createdAt, dayStart) || isSameDay(createdAt, dayStart);
      });

      // For simplified CFD, estimate status distribution
      // If the task's updatedAt is after this day, use a prior status estimate
      const statusCounts: Record<string, number> = {};
      STATUS_GROUPS.forEach((g) => {
        statusCounts[g.key] = 0;
      });

      existingTasks.forEach((task) => {
        const updatedAt = new Date(task.updatedAt);
        const createdAt = new Date(task.createdAt);

        // If task was updated after this day, estimate its status on this day
        if (isAfter(updatedAt, dayStart) && !isSameDay(updatedAt, dayStart)) {
          // Task was in an earlier state - estimate based on current status
          const currentGroup = STATUS_GROUPS.find((g) => g.statuses.includes(task.status));
          if (currentGroup) {
            const groupIndex = STATUS_GROUPS.indexOf(currentGroup);
            // Assume it was in an earlier stage (closer to backlog)
            const daysFromCreate = Math.max(1, Math.floor((dayStart.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
            const totalDays = Math.max(1, Math.floor((updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
            const progress = Math.min(1, daysFromCreate / totalDays);
            const estimatedGroupIndex = Math.min(groupIndex, Math.floor(progress * (groupIndex + 1)));
            const estimatedGroup = STATUS_GROUPS[STATUS_GROUPS.length - 1 - estimatedGroupIndex];
            if (estimatedGroup) {
              statusCounts[estimatedGroup.key]++;
            } else {
              statusCounts["backlog"]++;
            }
          }
        } else {
          // Task status is accurate for this day
          const group = STATUS_GROUPS.find((g) => g.statuses.includes(task.status));
          if (group) {
            statusCounts[group.key]++;
          }
        }
      });

      return {
        date: format(date, "MMM d"),
        fullDate: date,
        total: existingTasks.length,
        ...statusCounts,
      };
    });
  }, [tasks, days]);

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Cumulative Flow Diagram
          </CardTitle>
          <CardDescription>
            Track work distribution over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No tasks to display
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Cumulative Flow Diagram
        </CardTitle>
        <CardDescription>
          Work distribution over the last {days} days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-lg">
                        <p className="font-medium mb-2">{label}</p>
                        {[...payload].reverse().map((entry) => (
                          <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
                            <div
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-muted-foreground">{entry.name}:</span>
                            <span className="font-medium">{entry.value}</span>
                          </div>
                        ))}
                        <div className="border-t mt-2 pt-2 text-sm">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-medium ml-2">
                            {payload.reduce((sum, p) => sum + (Number(p.value) || 0), 0)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="rect"
                formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
              />
              {STATUS_GROUPS.slice().reverse().map((group) => (
                <Area
                  key={group.key}
                  type="monotone"
                  dataKey={group.key}
                  name={group.label}
                  stackId="1"
                  stroke={group.color}
                  fill={group.color}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
