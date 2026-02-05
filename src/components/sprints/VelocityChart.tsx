"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { SprintStatus } from "@/types";

interface SprintData {
  id: string;
  name: string;
  status: SprintStatus;
  completedPoints: number;
  totalPoints: number;
  startDate: Date | string;
  endDate: Date | string;
}

interface VelocityChartProps {
  sprints: SprintData[];
  showAverage?: boolean;
}

export function VelocityChart({ sprints, showAverage = true }: VelocityChartProps) {
  const chartData = useMemo(() => {
    // Filter to completed sprints and sort by date
    const completedSprints = sprints
      .filter((s) => s.status === "COMPLETED")
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
      .slice(-10); // Last 10 sprints

    return completedSprints.map((sprint, index) => ({
      name: sprint.name.length > 15 ? sprint.name.substring(0, 15) + "..." : sprint.name,
      fullName: sprint.name,
      velocity: sprint.completedPoints,
      planned: sprint.totalPoints,
      completion: sprint.totalPoints > 0
        ? Math.round((sprint.completedPoints / sprint.totalPoints) * 100)
        : 0,
      index,
    }));
  }, [sprints]);

  const metrics = useMemo(() => {
    if (chartData.length === 0) {
      return { average: 0, trend: "neutral" as const, trendValue: 0 };
    }

    const velocities = chartData.map((d) => d.velocity);
    const average = Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length);

    // Calculate trend (compare last 3 sprints average to overall average)
    let trend: "up" | "down" | "neutral" = "neutral";
    let trendValue = 0;

    if (chartData.length >= 3) {
      const recentAvg = velocities.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const olderAvg = velocities.slice(0, -3).length > 0
        ? velocities.slice(0, -3).reduce((a, b) => a + b, 0) / velocities.slice(0, -3).length
        : average;

      trendValue = Math.round(recentAvg - olderAvg);
      if (trendValue > 2) trend = "up";
      else if (trendValue < -2) trend = "down";
    }

    return { average, trend, trendValue };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Sprint Velocity
          </CardTitle>
          <CardDescription>
            Track story points completed per sprint
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Complete at least one sprint to see velocity data
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
              <TrendingUp className="h-5 w-5" />
              Sprint Velocity
            </CardTitle>
            <CardDescription>
              Story points completed per sprint
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{metrics.average}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
              avg pts/sprint
              {metrics.trend === "up" && (
                <span className="text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3" />
                  +{metrics.trendValue}
                </span>
              )}
              {metrics.trend === "down" && (
                <span className="text-red-600 flex items-center">
                  <TrendingDown className="h-3 w-3" />
                  {metrics.trendValue}
                </span>
              )}
              {metrics.trend === "neutral" && (
                <span className="text-muted-foreground flex items-center">
                  <Minus className="h-3 w-3" />
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{data.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          Velocity: <span className="font-medium text-foreground">{data.velocity} pts</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Planned: <span className="font-medium text-foreground">{data.planned} pts</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Completion: <span className="font-medium text-foreground">{data.completion}%</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {showAverage && (
                <ReferenceLine
                  y={metrics.average}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="5 5"
                  label={{
                    value: `Avg: ${metrics.average}`,
                    position: "right",
                    fontSize: 10,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                />
              )}
              <Bar dataKey="velocity" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.velocity >= metrics.average
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted-foreground))"
                    }
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
