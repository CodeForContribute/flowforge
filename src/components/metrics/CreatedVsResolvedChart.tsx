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
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, GitCompareArrows } from "lucide-react";
import { TaskStatus } from "@/types";
import { format, subDays, eachDayOfInterval, startOfDay, isSameDay } from "date-fns";

interface Task {
  id: string;
  status: TaskStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface CreatedVsResolvedChartProps {
  tasks: Task[];
  days?: number;
}

const DONE_STATUSES: TaskStatus[] = ["MERGED", "CLOSED"];

export function CreatedVsResolvedChart({ tasks, days = 30 }: CreatedVsResolvedChartProps) {
  const { chartData, metrics } = useMemo(() => {
    const now = new Date();
    const startDate = subDays(now, days);
    const dateRange = eachDayOfInterval({ start: startDate, end: now });

    let cumulativeCreated = 0;
    let cumulativeResolved = 0;

    // Count tasks created before the start date
    const tasksBeforeStart = tasks.filter((t) => new Date(t.createdAt) < startDate);
    cumulativeCreated = tasksBeforeStart.length;
    cumulativeResolved = tasksBeforeStart.filter((t) =>
      DONE_STATUSES.includes(t.status) && new Date(t.updatedAt) < startDate
    ).length;

    let totalCreated = 0;
    let totalResolved = 0;

    const data = dateRange.map((date) => {
      const dayStart = startOfDay(date);

      // Tasks created on this day
      const createdToday = tasks.filter((t) => {
        const createdAt = startOfDay(new Date(t.createdAt));
        return isSameDay(createdAt, dayStart);
      }).length;

      // Tasks resolved on this day (approximated by updatedAt for done statuses)
      const resolvedToday = tasks.filter((t) => {
        if (!DONE_STATUSES.includes(t.status)) return false;
        const updatedAt = startOfDay(new Date(t.updatedAt));
        return isSameDay(updatedAt, dayStart);
      }).length;

      cumulativeCreated += createdToday;
      cumulativeResolved += resolvedToday;
      totalCreated += createdToday;
      totalResolved += resolvedToday;

      return {
        date: format(date, "MMM d"),
        fullDate: date,
        created: createdToday,
        resolved: resolvedToday,
        cumulativeCreated,
        cumulativeResolved,
        netChange: createdToday - resolvedToday,
        backlog: cumulativeCreated - cumulativeResolved,
      };
    });

    // Calculate metrics
    const netChange = totalCreated - totalResolved;
    const avgCreatedPerDay = totalCreated / days;
    const avgResolvedPerDay = totalResolved / days;
    const ratio = totalCreated > 0 ? totalResolved / totalCreated : 1;

    let trend: "growing" | "shrinking" | "stable";
    if (netChange > 5) trend = "growing";
    else if (netChange < -5) trend = "shrinking";
    else trend = "stable";

    return {
      chartData: data,
      metrics: {
        totalCreated,
        totalResolved,
        netChange,
        avgCreatedPerDay,
        avgResolvedPerDay,
        ratio,
        trend,
        currentBacklog: data[data.length - 1]?.backlog || 0,
      },
    };
  }, [tasks, days]);

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompareArrows className="h-5 w-5" />
            Created vs Resolved
          </CardTitle>
          <CardDescription>
            Track task creation rate vs completion rate
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
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5" />
              Created vs Resolved
            </CardTitle>
            <CardDescription>
              Task throughput over the last {days} days
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                metrics.trend === "growing" ? "destructive" :
                metrics.trend === "shrinking" ? "default" : "secondary"
              }
              className="flex items-center gap-1"
            >
              {metrics.trend === "growing" && <TrendingUp className="h-3 w-3" />}
              {metrics.trend === "shrinking" && <TrendingDown className="h-3 w-3" />}
              {metrics.trend === "stable" && <Minus className="h-3 w-3" />}
              {metrics.trend === "growing" && "Backlog Growing"}
              {metrics.trend === "shrinking" && "Backlog Shrinking"}
              {metrics.trend === "stable" && "Stable"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-blue-500/10">
            <div className="text-2xl font-bold text-blue-600">{metrics.totalCreated}</div>
            <div className="text-xs text-muted-foreground">Created</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-500/10">
            <div className="text-2xl font-bold text-green-600">{metrics.totalResolved}</div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-violet-500/10">
            <div className="text-2xl font-bold text-violet-600">
              {Math.round(metrics.ratio * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Resolution Rate</div>
          </div>
          <div className={`text-center p-3 rounded-lg ${
            metrics.netChange > 0 ? "bg-red-500/10" : metrics.netChange < 0 ? "bg-green-500/10" : "bg-muted"
          }`}>
            <div className={`text-2xl font-bold ${
              metrics.netChange > 0 ? "text-red-600" : metrics.netChange < 0 ? "text-green-600" : ""
            }`}>
              {metrics.netChange > 0 ? "+" : ""}{metrics.netChange}
            </div>
            <div className="text-xs text-muted-foreground">Net Change</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px]">
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
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-lg">
                        <p className="font-medium mb-2">{label}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-blue-500" />
                            <span className="text-muted-foreground">Created:</span>
                            <span className="font-medium">{data.created}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-green-500" />
                            <span className="text-muted-foreground">Resolved:</span>
                            <span className="font-medium">{data.resolved}</span>
                          </div>
                          <div className="border-t pt-1 mt-1">
                            <span className="text-muted-foreground">Net:</span>
                            <span className={`font-medium ml-2 ${
                              data.netChange > 0 ? "text-red-500" :
                              data.netChange < 0 ? "text-green-500" : ""
                            }`}>
                              {data.netChange > 0 ? "+" : ""}{data.netChange}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Open Tasks:</span>
                            <span className="font-medium ml-2">{data.backlog}</span>
                          </div>
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
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="created"
                name="Created"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Resolved"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
