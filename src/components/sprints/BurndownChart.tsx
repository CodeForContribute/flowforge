"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SprintStatus } from "@/types";
import { format, eachDayOfInterval, differenceInDays, isBefore, isToday, isSameDay } from "date-fns";

interface BurndownChartProps {
  sprintName: string;
  status: SprintStatus;
  startDate: Date | string;
  endDate: Date | string;
  totalPoints: number;
  completedPoints: number;
}

export function BurndownChart({
  sprintName,
  status,
  startDate,
  endDate,
  totalPoints,
  completedPoints,
}: BurndownChartProps) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  const remainingPoints = totalPoints - completedPoints;

  const chartData = useMemo(() => {
    // Generate array of days in the sprint
    const days = eachDayOfInterval({ start, end });
    const totalDays = days.length;

    // Calculate ideal daily burn rate
    const idealDailyBurn = totalPoints / (totalDays - 1);

    return days.map((day, index) => {
      const dayNumber = index + 1;
      const idealRemaining = Math.max(0, totalPoints - idealDailyBurn * index);

      // For completed sprints or past days, estimate based on linear interpolation
      let actualRemaining: number | null = null;

      if (status === "COMPLETED") {
        // For completed sprints, show a linear interpolation to final value
        const completionRate = (totalPoints - remainingPoints) / totalPoints;
        actualRemaining = Math.max(0, totalPoints - totalPoints * completionRate * (index / (totalDays - 1)));
        if (index === totalDays - 1) {
          actualRemaining = remainingPoints;
        }
      } else if (status === "ACTIVE") {
        // For active sprints, show actual progress up to today
        if (isBefore(day, now) || isToday(day) || isSameDay(day, now)) {
          // Calculate progress rate so far
          const elapsedDays = differenceInDays(now, start) + 1;
          const dailyProgress = completedPoints / Math.max(1, elapsedDays);
          const estimatedCompleted = Math.min(totalPoints, dailyProgress * (index + 1));
          actualRemaining = Math.max(0, totalPoints - estimatedCompleted);

          // On the current day, show actual remaining
          if (isToday(day) || isSameDay(day, now)) {
            actualRemaining = remainingPoints;
          }
        }
      }

      return {
        day: format(day, "MMM d"),
        dayNumber,
        ideal: Math.round(idealRemaining * 10) / 10,
        actual: actualRemaining !== null ? Math.round(actualRemaining * 10) / 10 : null,
        isToday: isToday(day) || isSameDay(day, now),
        isPast: isBefore(day, now) && !isToday(day),
      };
    });
  }, [start, end, totalPoints, completedPoints, remainingPoints, status, now]);

  const metrics = useMemo(() => {
    const elapsedDays = Math.max(1, differenceInDays(now, start) + 1);
    const totalDays = differenceInDays(end, start) + 1;
    const remainingDays = Math.max(0, differenceInDays(end, now));

    // Where we should be (ideal)
    const idealCompleted = (totalPoints * elapsedDays) / totalDays;
    const idealRemaining = totalPoints - idealCompleted;

    // Status assessment
    const pointsAhead = idealRemaining - remainingPoints;
    const isAhead = pointsAhead > 0;
    const isBehind = pointsAhead < -2;
    const isOnTrack = !isAhead && !isBehind;

    return {
      elapsedDays,
      totalDays,
      remainingDays,
      idealRemaining: Math.round(idealRemaining),
      pointsAhead: Math.round(Math.abs(pointsAhead)),
      isAhead,
      isBehind,
      isOnTrack,
    };
  }, [start, end, now, totalPoints, remainingPoints]);

  if (status === "PLANNING") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Sprint Burndown
          </CardTitle>
          <CardDescription>
            Visual progress tracking for {sprintName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Start the sprint to see the burndown chart
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
              <TrendingDown className="h-5 w-5" />
              Sprint Burndown
            </CardTitle>
            <CardDescription>
              {sprintName} - {totalPoints} total points
            </CardDescription>
          </div>
          {status === "ACTIVE" && (
            <Badge
              variant={metrics.isAhead ? "default" : metrics.isBehind ? "destructive" : "secondary"}
              className="flex items-center gap-1"
            >
              {metrics.isAhead && (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  {metrics.pointsAhead} pts ahead
                </>
              )}
              {metrics.isBehind && (
                <>
                  <AlertTriangle className="h-3 w-3" />
                  {metrics.pointsAhead} pts behind
                </>
              )}
              {metrics.isOnTrack && "On Track"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                domain={[0, totalPoints]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{data.day}</p>
                        <p className="text-sm text-muted-foreground">
                          Ideal: <span className="font-medium text-foreground">{data.ideal} pts</span>
                        </p>
                        {data.actual !== null && (
                          <p className="text-sm text-muted-foreground">
                            Actual: <span className="font-medium text-foreground">{data.actual} pts</span>
                          </p>
                        )}
                        {data.isToday && (
                          <Badge variant="outline" className="mt-1 text-xs">Today</Badge>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Ideal burndown line */}
              <Line
                type="linear"
                dataKey="ideal"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Ideal"
              />
              {/* Actual burndown line */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                name="Actual"
              />
              {/* Today marker */}
              {status === "ACTIVE" && chartData.find((d) => d.isToday) && (
                <ReferenceDot
                  x={chartData.find((d) => d.isToday)?.day}
                  y={remainingPoints}
                  r={6}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-muted-foreground" style={{ borderStyle: "dashed" }} />
            <span className="text-muted-foreground">Ideal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-primary" />
            <span className="text-muted-foreground">Actual</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
