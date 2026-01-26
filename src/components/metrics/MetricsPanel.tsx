"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  AlertTriangle,
  Target,
  Users,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { TasksByStatusChart } from "./TasksByStatusChart";
import { SprintProgressBar } from "./SprintProgressBar";
import { TaskStatus, TaskPriority, SprintStatus } from "@/types";

interface Task {
  id: string;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints: number | null;
  dueDate: Date | null;
  assigneeId: string | null;
}

interface Sprint {
  id: string;
  name: string;
  status: SprintStatus;
  startDate: Date;
  endDate: Date;
  tasks: {
    id: string;
    status: TaskStatus;
    storyPoints: number | null;
  }[];
}

interface Member {
  id: string;
  userId: string;
  user: {
    name: string | null;
  };
}

interface MetricsPanelProps {
  tasks: Task[];
  sprints: Sprint[];
  members: Member[];
}

export function MetricsPanel({ tasks, sprints, members }: MetricsPanelProps) {
  // Calculate task statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (t) => t.status === "MERGED" || t.status === "CLOSED"
  ).length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "GENERATING" || t.status === "PR_OPEN" || t.status === "IN_REVIEW"
  ).length;

  // Calculate overdue tasks
  const now = new Date();
  const overdueTasks = tasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) < now &&
      !["MERGED", "CLOSED"].includes(t.status)
  ).length;

  // Calculate story points
  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedPoints = tasks
    .filter((t) => t.status === "MERGED" || t.status === "CLOSED")
    .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  // Get active sprint
  const activeSprint = sprints.find((s) => s.status === "ACTIVE");

  // Calculate tasks by priority
  const tasksByPriority = {
    URGENT: tasks.filter((t) => t.priority === "URGENT" && !["MERGED", "CLOSED"].includes(t.status)).length,
    HIGH: tasks.filter((t) => t.priority === "HIGH" && !["MERGED", "CLOSED"].includes(t.status)).length,
    MEDIUM: tasks.filter((t) => t.priority === "MEDIUM" && !["MERGED", "CLOSED"].includes(t.status)).length,
    LOW: tasks.filter((t) => t.priority === "LOW" && !["MERGED", "CLOSED"].includes(t.status)).length,
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {completedTasks} completed ({totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTasks}</div>
            <p className="text-xs text-muted-foreground">
              Active work items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Story Points</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedPoints}/{totalPoints}
            </div>
            <p className="text-xs text-muted-foreground">
              Points completed
            </p>
          </CardContent>
        </Card>

        <Card className={overdueTasks > 0 ? "border-destructive" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${overdueTasks > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueTasks > 0 ? "text-destructive" : ""}`}>
              {overdueTasks}
            </div>
            <p className="text-xs text-muted-foreground">
              Tasks past due date
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tasks by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <TasksByStatusChart tasks={tasks} />
          </CardContent>
        </Card>

        {/* Active Sprint Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Active Sprint
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeSprint ? (
              <SprintProgressBar sprint={activeSprint} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No active sprint. Start a sprint to track progress.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tasks by Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open Tasks by Priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">Urgent</span>
              </div>
              <span className="font-medium">{tasksByPriority.URGENT}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm">High</span>
              </div>
              <span className="font-medium">{tasksByPriority.HIGH}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm">Medium</span>
              </div>
              <span className="font-medium">{tasksByPriority.MEDIUM}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm">Low</span>
              </div>
              <span className="font-medium">{tasksByPriority.LOW}</span>
            </div>
          </CardContent>
        </Card>

        {/* Team Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Workload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No team members yet.
              </p>
            ) : (
              members.slice(0, 5).map((member) => {
                const memberTasks = tasks.filter(
                  (t) =>
                    t.assigneeId === member.userId &&
                    !["MERGED", "CLOSED"].includes(t.status)
                );
                return (
                  <div key={member.id} className="flex items-center justify-between">
                    <span className="text-sm">
                      {member.user.name || "Unknown"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{memberTasks.length} tasks</Badge>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
