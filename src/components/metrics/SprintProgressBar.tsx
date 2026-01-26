"use client";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, CheckCircle2 } from "lucide-react";
import { format, differenceInDays, isAfter } from "date-fns";
import { TaskStatus, SprintStatus } from "@/types";

interface Sprint {
  id: string;
  name: string;
  status: SprintStatus;
  startDate: Date | string;
  endDate: Date | string;
  tasks: {
    id: string;
    status: TaskStatus;
    storyPoints: number | null;
  }[];
}

interface SprintProgressBarProps {
  sprint: Sprint;
}

export function SprintProgressBar({ sprint }: SprintProgressBarProps) {
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);
  const now = new Date();

  const totalDays = differenceInDays(endDate, startDate);
  const elapsedDays = differenceInDays(now, startDate);
  const remainingDays = differenceInDays(endDate, now);
  const timeProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  const totalTasks = sprint.tasks.length;
  const completedTasks = sprint.tasks.filter(
    (t) => t.status === "MERGED" || t.status === "CLOSED"
  ).length;
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const totalPoints = sprint.tasks.reduce(
    (sum, t) => sum + (t.storyPoints || 0),
    0
  );
  const completedPoints = sprint.tasks
    .filter((t) => t.status === "MERGED" || t.status === "CLOSED")
    .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  const isOverdue = isAfter(now, endDate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{sprint.name}</h3>
        <Badge variant={sprint.status === "ACTIVE" ? "default" : "secondary"}>
          {sprint.status}
        </Badge>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>
          {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
        </span>
        {isOverdue ? (
          <Badge variant="destructive" className="ml-auto">
            Overdue by {Math.abs(remainingDays)} days
          </Badge>
        ) : remainingDays >= 0 ? (
          <span className="ml-auto">{remainingDays} days remaining</span>
        ) : null}
      </div>

      {/* Time Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Time Elapsed</span>
          <span>{Math.round(timeProgress)}%</span>
        </div>
        <Progress value={timeProgress} className="h-2" />
      </div>

      {/* Task Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Target className="h-3 w-3" />
            Tasks
          </span>
          <span>
            {completedTasks}/{totalTasks} ({Math.round(taskProgress)}%)
          </span>
        </div>
        <Progress value={taskProgress} className="h-2" />
      </div>

      {/* Points Progress (if applicable) */}
      {totalPoints > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Story Points
            </span>
            <span>
              {completedPoints}/{totalPoints} pts
            </span>
          </div>
          <Progress
            value={totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0}
            className="h-2"
          />
        </div>
      )}

      {/* Health indicator */}
      {sprint.status === "ACTIVE" && (
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            {taskProgress >= timeProgress ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-green-600 dark:text-green-400">On track</span>
              </>
            ) : taskProgress >= timeProgress - 15 ? (
              <>
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-yellow-600 dark:text-yellow-400">Slightly behind</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-600 dark:text-red-400">At risk</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
