"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Calendar,
  Users,
  Zap,
  Plus,
  BarChart3,
} from "lucide-react";
import { TaskStatus, TaskPriority, SprintStatus } from "@/types";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  taskKey: string;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: Date | string;
  endDate: Date | string;
}

interface SprintReportProps {
  sprint: Sprint;
  tasks: Task[];
  previousSprint?: {
    completedPoints: number;
    completedTasks: number;
  } | null;
}

const DONE_STATUSES: TaskStatus[] = ["MERGED", "CLOSED"];
const IN_PROGRESS_STATUSES: TaskStatus[] = ["IN_PROGRESS", "GENERATING", "PR_OPEN", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED", "HAS_CONFLICTS", "AWAITING_CODE_REVIEW"];

export function SprintReport({ sprint, tasks, previousSprint }: SprintReportProps) {
  const stats = useMemo(() => {
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const now = new Date();

    // Task categorization
    const completedTasks = tasks.filter((t) => DONE_STATUSES.includes(t.status));
    const incompleteTasks = tasks.filter((t) => !DONE_STATUSES.includes(t.status));
    const inProgressTasks = tasks.filter((t) => IN_PROGRESS_STATUSES.includes(t.status));

    // Story points
    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedPoints = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const incompletePoints = incompleteTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    // Scope changes (tasks added after sprint start)
    const tasksAddedMidSprint = tasks.filter((t) => {
      const createdAt = new Date(t.createdAt);
      return createdAt > startDate;
    });
    const pointsAddedMidSprint = tasksAddedMidSprint.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    // Time metrics
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const elapsedDays = sprint.status === "COMPLETED"
      ? totalDays
      : Math.max(0, differenceInDays(now, startDate) + 1);
    const remainingDays = Math.max(0, differenceInDays(endDate, now));

    // Completion rates
    const taskCompletionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
    const pointsCompletionRate = totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0;

    // Velocity comparison
    const velocityChange = previousSprint
      ? ((completedPoints - previousSprint.completedPoints) / previousSprint.completedPoints) * 100
      : 0;

    // Average points per task
    const avgPointsPerTask = completedTasks.length > 0
      ? completedPoints / completedTasks.length
      : 0;

    // Tasks by priority
    const tasksByPriority = {
      URGENT: { total: 0, completed: 0 },
      HIGH: { total: 0, completed: 0 },
      MEDIUM: { total: 0, completed: 0 },
      LOW: { total: 0, completed: 0 },
    };
    tasks.forEach((t) => {
      tasksByPriority[t.priority].total++;
      if (DONE_STATUSES.includes(t.status)) {
        tasksByPriority[t.priority].completed++;
      }
    });

    // Team contribution
    const memberContributions = new Map<string, { name: string; completed: number; points: number }>();
    completedTasks.forEach((t) => {
      if (t.assignee) {
        const existing = memberContributions.get(t.assignee.id) || {
          name: t.assignee.name || "Unknown",
          completed: 0,
          points: 0,
        };
        existing.completed++;
        existing.points += t.storyPoints || 0;
        memberContributions.set(t.assignee.id, existing);
      }
    });

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      incompleteTasks: incompleteTasks.length,
      inProgressTasks: inProgressTasks.length,
      totalPoints,
      completedPoints,
      incompletePoints,
      tasksAddedMidSprint: tasksAddedMidSprint.length,
      pointsAddedMidSprint,
      totalDays,
      elapsedDays,
      remainingDays,
      taskCompletionRate,
      pointsCompletionRate,
      velocityChange,
      avgPointsPerTask,
      tasksByPriority,
      memberContributions: Array.from(memberContributions.values()).sort((a, b) => b.points - a.points),
      completedTasksList: completedTasks,
      incompleteTasksList: incompleteTasks,
    };
  }, [sprint, tasks, previousSprint]);

  const isCompleted = sprint.status === "COMPLETED";

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <Card className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">{sprint.name}</h2>
              {sprint.goal && (
                <p className="text-white/70">{sprint.goal}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-white/70">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(sprint.startDate), "MMM d")} - {format(new Date(sprint.endDate), "MMM d, yyyy")}
                </span>
                <span>|</span>
                <span>{stats.totalDays} days</span>
              </div>
            </div>
            <Badge
              variant={isCompleted ? "default" : "secondary"}
              className={cn(
                "text-sm",
                isCompleted && "bg-green-500 hover:bg-green-500"
              )}
            >
              {isCompleted ? "Completed" : sprint.status}
            </Badge>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-300" />
                <span className="text-sm text-white/70">Completed</span>
              </div>
              <div className="text-2xl font-bold">
                {stats.completedTasks}/{stats.totalTasks}
              </div>
              <div className="text-xs text-white/50">
                {Math.round(stats.taskCompletionRate)}% of tasks
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-blue-300" />
                <span className="text-sm text-white/70">Points Delivered</span>
              </div>
              <div className="text-2xl font-bold">
                {stats.completedPoints}/{stats.totalPoints}
              </div>
              <div className="text-xs text-white/50">
                {Math.round(stats.pointsCompletionRate)}% of points
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-amber-300" />
                <span className="text-sm text-white/70">Velocity</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stats.completedPoints}</span>
                <span className="text-sm text-white/50">pts</span>
              </div>
              {previousSprint && stats.velocityChange !== 0 && (
                <div className={cn(
                  "text-xs flex items-center gap-1",
                  stats.velocityChange > 0 ? "text-green-300" : "text-red-300"
                )}>
                  {stats.velocityChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(Math.round(stats.velocityChange))}% vs last
                </div>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-orange-300" />
                <span className="text-sm text-white/70">Scope Change</span>
              </div>
              <div className="text-2xl font-bold">
                +{stats.tasksAddedMidSprint}
              </div>
              <div className="text-xs text-white/50">
                +{stats.pointsAddedMidSprint} pts added
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Completion by Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Completion by Priority
            </CardTitle>
            <CardDescription>Task completion rates by priority level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(["URGENT", "HIGH", "MEDIUM", "LOW"] as const).map((priority) => {
              const data = stats.tasksByPriority[priority];
              const rate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
              const priorityColors = {
                URGENT: "bg-red-500",
                HIGH: "bg-orange-500",
                MEDIUM: "bg-blue-500",
                LOW: "bg-slate-400",
              };

              return (
                <div key={priority} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", priorityColors[priority])} />
                      <span className="font-medium capitalize">{priority.toLowerCase()}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {data.completed}/{data.total} ({Math.round(rate)}%)
                    </span>
                  </div>
                  <Progress value={rate} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Team Contributions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              Team Contributions
            </CardTitle>
            <CardDescription>Points delivered by team member</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.memberContributions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No completed tasks with assignees
              </div>
            ) : (
              <div className="space-y-3">
                {stats.memberContributions.slice(0, 5).map((member, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{member.name}</span>
                        <Badge variant="secondary">{member.points} pts</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.completed} tasks completed
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Completed Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Completed ({stats.completedTasks})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.completedTasksList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No completed tasks
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.completedTasksList.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <div>
                              <div className="font-medium">{task.taskKey}</div>
                              <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {task.title}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {task.storyPoints || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incomplete Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Not Completed ({stats.incompleteTasks})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.incompleteTasksList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                All tasks completed!
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.incompleteTasksList.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{task.taskKey}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[150px]">
                              {task.title}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {task.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {task.storyPoints || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sprint Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sprint Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Initial Scope</div>
              <div className="text-2xl font-bold">
                {stats.totalTasks - stats.tasksAddedMidSprint} tasks
              </div>
              <div className="text-sm text-muted-foreground">
                {stats.totalPoints - stats.pointsAddedMidSprint} points
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Plus className="h-3 w-3" /> Added Mid-Sprint
              </div>
              <div className="text-2xl font-bold text-orange-500">
                {stats.tasksAddedMidSprint} tasks
              </div>
              <div className="text-sm text-muted-foreground">
                {stats.pointsAddedMidSprint} points
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Final Scope</div>
              <div className="text-2xl font-bold">
                {stats.totalTasks} tasks
              </div>
              <div className="text-sm text-muted-foreground">
                {stats.totalPoints} points
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Avg Points/Task</div>
              <div className="text-2xl font-bold">
                {stats.avgPointsPerTask.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">
                per completed task
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
