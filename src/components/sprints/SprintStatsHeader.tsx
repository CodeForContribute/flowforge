"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  TrendingUp,
  CheckCircle2,
  Circle,
  Clock,
} from "lucide-react";
import { SprintStatus } from "@/types";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface SprintStats {
  totalTasks: number;
  completedTasks: number;
  totalPoints: number;
  completedPoints: number;
  progress: number;
}

interface SprintStatsHeaderProps {
  stats: SprintStats;
  startDate: Date | string;
  endDate: Date | string;
  status: SprintStatus;
  compact?: boolean;
}

export function SprintStatsHeader({
  stats,
  startDate,
  endDate,
  status,
  compact = false,
}: SprintStatsHeaderProps) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  const sprintMetrics = useMemo(() => {
    const totalDays = differenceInDays(end, start) + 1;
    const elapsedDays = Math.max(0, Math.min(totalDays, differenceInDays(now, start) + 1));
    const remainingDays = Math.max(0, differenceInDays(end, now));
    const remainingPoints = stats.totalPoints - stats.completedPoints;

    // Points-based progress percentage
    const pointsProgress = stats.totalPoints > 0
      ? Math.round((stats.completedPoints / stats.totalPoints) * 100)
      : 0;

    // Ideal points completed by now (linear)
    const idealPointsCompleted = stats.totalPoints > 0 && totalDays > 0
      ? Math.round((stats.totalPoints * elapsedDays) / totalDays)
      : 0;

    // Velocity (points per day so far)
    const currentVelocity = elapsedDays > 0
      ? Math.round((stats.completedPoints / elapsedDays) * 10) / 10
      : 0;

    // Required velocity to finish on time
    const requiredVelocity = remainingDays > 0 && remainingPoints > 0
      ? Math.round((remainingPoints / remainingDays) * 10) / 10
      : 0;

    // Status indicators
    const isAhead = stats.completedPoints > idealPointsCompleted;
    const isBehind = stats.completedPoints < idealPointsCompleted;
    const isOnTrack = !isAhead && !isBehind;

    return {
      totalDays,
      elapsedDays,
      remainingDays,
      remainingPoints,
      pointsProgress,
      idealPointsCompleted,
      currentVelocity,
      requiredVelocity,
      isAhead,
      isBehind,
      isOnTrack,
    };
  }, [stats, start, end, now]);

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {/* Points Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              Points
            </span>
            <span className="font-semibold">
              {stats.completedPoints}/{stats.totalPoints}
            </span>
          </div>
          <Progress
            value={sprintMetrics.pointsProgress}
            className="h-2"
          />
        </div>

        {/* Task Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Tasks
            </span>
            <span className="font-semibold">
              {stats.completedTasks}/{stats.totalTasks}
            </span>
          </div>
          <Progress
            value={stats.progress}
            className="h-2"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Story Points Card */}
      <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-2">
            <Target className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Story Points</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{stats.completedPoints}</span>
            <span className="text-lg text-muted-foreground">/ {stats.totalPoints}</span>
          </div>
          <Progress
            value={sprintMetrics.pointsProgress}
            className="h-2 mt-2"
          />
          <div className="text-xs text-muted-foreground mt-1">
            {sprintMetrics.pointsProgress}% complete
          </div>
        </CardContent>
      </Card>

      {/* Tasks Card */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Tasks</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{stats.completedTasks}</span>
            <span className="text-lg text-muted-foreground">/ {stats.totalTasks}</span>
          </div>
          <Progress
            value={stats.progress}
            className="h-2 mt-2"
          />
          <div className="text-xs text-muted-foreground mt-1">
            {stats.progress}% complete
          </div>
        </CardContent>
      </Card>

      {/* Velocity Card */}
      {status === "ACTIVE" && (
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Velocity</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{sprintMetrics.currentVelocity}</span>
              <span className="text-sm text-muted-foreground">pts/day</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Need {sprintMetrics.requiredVelocity} pts/day to finish
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Remaining Card */}
      {status === "ACTIVE" && (
        <Card className={cn(
          "bg-gradient-to-br border",
          sprintMetrics.remainingDays <= 2
            ? "from-red-500/10 to-orange-500/10 border-red-500/20"
            : "from-amber-500/10 to-yellow-500/10 border-amber-500/20"
        )}>
          <CardContent className="p-4">
            <div className={cn(
              "flex items-center gap-2 mb-2",
              sprintMetrics.remainingDays <= 2
                ? "text-red-600 dark:text-red-400"
                : "text-amber-600 dark:text-amber-400"
            )}>
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Time Left</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{sprintMetrics.remainingDays}</span>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {sprintMetrics.remainingPoints} points remaining
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sprint Status Indicator (for non-active sprints) */}
      {status !== "ACTIVE" && (
        <Card className="bg-gradient-to-br from-slate-500/10 to-gray-500/10 border-slate-500/20 col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-2">
              {status === "PLANNING" ? (
                <Circle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span className="text-xs font-medium uppercase tracking-wider">
                {status === "PLANNING" ? "Planning Phase" : "Sprint Complete"}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {status === "PLANNING" ? (
                <>
                  {stats.totalPoints > 0 ? (
                    <span>Sprint has {stats.totalPoints} story points planned across {stats.totalTasks} tasks</span>
                  ) : (
                    <span>Add tasks to this sprint to begin planning</span>
                  )}
                </>
              ) : (
                <span>Completed {stats.completedPoints} of {stats.totalPoints} points ({sprintMetrics.pointsProgress}%)</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
