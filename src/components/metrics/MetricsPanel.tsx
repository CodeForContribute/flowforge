"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  Target,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  Zap,
  Activity,
  Layers,
  Flame,
  ArrowUp,
  ArrowDown,
  Minus,
  BarChart3,
  PieChart,
} from "lucide-react";
import { TasksByStatusChart } from "./TasksByStatusChart";
import { SprintProgressBar } from "./SprintProgressBar";
import { CumulativeFlowChart } from "./CumulativeFlowChart";
import { CreatedVsResolvedChart } from "./CreatedVsResolvedChart";
import { TaskStatus, TaskPriority, SprintStatus } from "@/types";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints: number | null;
  dueDate: Date | null;
  assigneeId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
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

// Helper function to calculate health score
function calculateHealthScore(stats: {
  completionRate: number;
  overdueRate: number;
  velocityTrend: number;
  estimationCoverage: number;
}): { score: number; level: "excellent" | "good" | "warning" | "critical" } {
  const { completionRate, overdueRate, velocityTrend, estimationCoverage } = stats;

  // Weight each factor
  const score = Math.round(
    completionRate * 0.35 +
    (100 - overdueRate * 100) * 0.25 +
    Math.min(100, 50 + velocityTrend * 50) * 0.2 +
    estimationCoverage * 0.2
  );

  let level: "excellent" | "good" | "warning" | "critical";
  if (score >= 80) level = "excellent";
  else if (score >= 60) level = "good";
  else if (score >= 40) level = "warning";
  else level = "critical";

  return { score, level };
}

export function MetricsPanel({ tasks, sprints, members }: MetricsPanelProps) {
  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (t) => t.status === "MERGED" || t.status === "CLOSED"
    ).length;
    const inProgressTasks = tasks.filter(
      (t) => ["IN_PROGRESS", "GENERATING", "PR_OPEN", "IN_REVIEW"].includes(t.status)
    ).length;

    const now = new Date();
    const overdueTasks = tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        !["MERGED", "CLOSED"].includes(t.status)
    ).length;

    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedPoints = tasks
      .filter((t) => t.status === "MERGED" || t.status === "CLOSED")
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    const estimatedTasks = tasks.filter((t) => t.storyPoints !== null).length;
    const estimationCoverage = totalTasks > 0 ? (estimatedTasks / totalTasks) * 100 : 0;

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const overdueRate = totalTasks > 0 ? overdueTasks / totalTasks : 0;

    // Calculate velocity from completed sprints
    const completedSprints = sprints.filter((s) => s.status === "COMPLETED");
    const velocities = completedSprints.map((s) => {
      const completed = s.tasks.filter((t) => t.status === "MERGED" || t.status === "CLOSED");
      return completed.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    });
    const avgVelocity = velocities.length > 0 ? velocities.reduce((a, b) => a + b, 0) / velocities.length : 0;

    // Velocity trend (compare last 2 sprints)
    let velocityTrend = 0;
    if (velocities.length >= 2) {
      const lastVelocity = velocities[velocities.length - 1];
      const prevVelocity = velocities[velocities.length - 2];
      velocityTrend = prevVelocity > 0 ? (lastVelocity - prevVelocity) / prevVelocity : 0;
    }

    // Calculate health score
    const health = calculateHealthScore({
      completionRate,
      overdueRate,
      velocityTrend,
      estimationCoverage,
    });

    // Tasks by priority
    const tasksByPriority = {
      URGENT: tasks.filter((t) => t.priority === "URGENT" && !["MERGED", "CLOSED"].includes(t.status)).length,
      HIGH: tasks.filter((t) => t.priority === "HIGH" && !["MERGED", "CLOSED"].includes(t.status)).length,
      MEDIUM: tasks.filter((t) => t.priority === "MEDIUM" && !["MERGED", "CLOSED"].includes(t.status)).length,
      LOW: tasks.filter((t) => t.priority === "LOW" && !["MERGED", "CLOSED"].includes(t.status)).length,
    };

    // Tasks by status distribution
    const statusDistribution = {
      backlog: tasks.filter((t) => t.status === "BACKLOG").length,
      todo: tasks.filter((t) => t.status === "TODO").length,
      inProgress: tasks.filter((t) => ["IN_PROGRESS", "GENERATING"].includes(t.status)).length,
      inReview: tasks.filter((t) => ["PR_OPEN", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED"].includes(t.status)).length,
      done: tasks.filter((t) => ["MERGED", "CLOSED"].includes(t.status)).length,
    };

    // Member workload
    const memberWorkload = members.map((member) => {
      const memberTasks = tasks.filter(
        (t) => t.assigneeId === member.userId && !["MERGED", "CLOSED"].includes(t.status)
      );
      const memberPoints = memberTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const completed = tasks.filter(
        (t) => t.assigneeId === member.userId && ["MERGED", "CLOSED"].includes(t.status)
      ).length;
      return {
        ...member,
        openTasks: memberTasks.length,
        points: memberPoints,
        completed,
      };
    }).sort((a, b) => b.openTasks - a.openTasks);

    // Active sprint
    const activeSprint = sprints.find((s) => s.status === "ACTIVE");

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      totalPoints,
      completedPoints,
      estimationCoverage,
      completionRate,
      avgVelocity,
      velocityTrend,
      health,
      tasksByPriority,
      statusDistribution,
      memberWorkload,
      activeSprint,
      velocities,
    };
  }, [tasks, sprints, members]);

  const healthColors = {
    excellent: "text-green-500 bg-green-500/10 border-green-500/20",
    good: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    warning: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    critical: "text-red-500 bg-red-500/10 border-red-500/20",
  };

  const healthLabels = {
    excellent: "Excellent",
    good: "Good",
    warning: "Needs Attention",
    critical: "Critical",
  };

  return (
    <div className="space-y-8">
      {/* Hero Section - Project Health */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)]" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Project Health</h2>
              <p className="text-white/70 max-w-md">
                Overall project status based on completion rate, velocity, and team capacity.
              </p>
            </div>
            <div className={cn(
              "rounded-2xl p-4 border backdrop-blur-sm",
              healthColors[stats.health.level]
            )}>
              <div className="text-center">
                <div className="text-4xl font-bold">{stats.health.score}</div>
                <div className="text-sm font-medium opacity-90">{healthLabels[stats.health.level]}</div>
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-white/70" />
                <span className="text-sm text-white/70">Completion</span>
              </div>
              <div className="text-2xl font-bold">{Math.round(stats.completionRate)}%</div>
              <Progress value={stats.completionRate} className="h-1.5 mt-2 bg-white/20" />
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-white/70" />
                <span className="text-sm text-white/70">Avg. Velocity</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{Math.round(stats.avgVelocity)}</span>
                <span className="text-sm text-white/70">pts/sprint</span>
              </div>
              {stats.velocityTrend !== 0 && (
                <div className={cn(
                  "flex items-center gap-1 text-sm mt-1",
                  stats.velocityTrend > 0 ? "text-green-300" : "text-red-300"
                )}>
                  {stats.velocityTrend > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(Math.round(stats.velocityTrend * 100))}% from last
                </div>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-white/70" />
                <span className="text-sm text-white/70">Story Points</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stats.completedPoints}</span>
                <span className="text-sm text-white/70">/ {stats.totalPoints}</span>
              </div>
              <Progress value={(stats.completedPoints / (stats.totalPoints || 1)) * 100} className="h-1.5 mt-2 bg-white/20" />
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="h-4 w-4 text-white/70" />
                <span className="text-sm text-white/70">Estimation</span>
              </div>
              <div className="text-2xl font-bold">{Math.round(stats.estimationCoverage)}%</div>
              <Progress value={stats.estimationCoverage} className="h-1.5 mt-2 bg-white/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Tasks"
          value={stats.totalTasks}
          subtitle={`${stats.completedTasks} completed`}
          icon={<Target className="h-5 w-5" />}
          trend={stats.completionRate > 50 ? "up" : stats.completionRate > 25 ? "neutral" : "down"}
          color="violet"
        />

        <MetricCard
          title="In Progress"
          value={stats.inProgressTasks}
          subtitle="Active work items"
          icon={<Activity className="h-5 w-5" />}
          color="blue"
        />

        <MetricCard
          title="Overdue"
          value={stats.overdueTasks}
          subtitle="Past due date"
          icon={<AlertTriangle className="h-5 w-5" />}
          color={stats.overdueTasks > 0 ? "red" : "green"}
          highlight={stats.overdueTasks > 0}
        />

        <MetricCard
          title="Team Size"
          value={members.length}
          subtitle={`${stats.memberWorkload.filter(m => m.openTasks > 0).length} active`}
          icon={<Users className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Task Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-muted-foreground" />
                  Task Distribution
                </CardTitle>
                <CardDescription>Tasks by current status</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TasksByStatusChart tasks={tasks} />
          </CardContent>
        </Card>

        {/* Active Sprint */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  Active Sprint
                </CardTitle>
                <CardDescription>
                  {stats.activeSprint ? stats.activeSprint.name : "No active sprint"}
                </CardDescription>
              </div>
              {stats.activeSprint && (
                <Badge variant="default" className="bg-green-500">
                  Active
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {stats.activeSprint ? (
              <SprintProgressBar sprint={stats.activeSprint} />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No active sprint</p>
                <p className="text-sm text-muted-foreground">Start a sprint to track progress</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Priority & Workload Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              Open Tasks by Priority
            </CardTitle>
            <CardDescription>Tasks requiring attention by urgency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PriorityBar
              label="Urgent"
              count={stats.tasksByPriority.URGENT}
              total={stats.totalTasks - stats.completedTasks}
              color="bg-red-500"
              icon={<Flame className="h-4 w-4" />}
            />
            <PriorityBar
              label="High"
              count={stats.tasksByPriority.HIGH}
              total={stats.totalTasks - stats.completedTasks}
              color="bg-orange-500"
              icon={<ArrowUp className="h-4 w-4" />}
            />
            <PriorityBar
              label="Medium"
              count={stats.tasksByPriority.MEDIUM}
              total={stats.totalTasks - stats.completedTasks}
              color="bg-blue-500"
              icon={<Minus className="h-4 w-4" />}
            />
            <PriorityBar
              label="Low"
              count={stats.tasksByPriority.LOW}
              total={stats.totalTasks - stats.completedTasks}
              color="bg-slate-400"
              icon={<ArrowDown className="h-4 w-4" />}
            />
          </CardContent>
        </Card>

        {/* Team Workload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              Team Workload
            </CardTitle>
            <CardDescription>Current task distribution across team members</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.memberWorkload.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No team members</p>
                <p className="text-sm text-muted-foreground">Add members to track workload</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.memberWorkload.slice(0, 5).map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {member.user.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">{member.user.name || "Unknown"}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {member.openTasks} open
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {member.points} pts
                          </Badge>
                        </div>
                      </div>
                      <Progress
                        value={Math.min(100, (member.openTasks / 5) * 100)}
                        className={cn(
                          "h-1.5",
                          member.openTasks > 5 && "[&>div]:bg-red-500",
                          member.openTasks > 3 && member.openTasks <= 5 && "[&>div]:bg-amber-500"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Velocity Chart */}
      {stats.velocities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Velocity Trend
            </CardTitle>
            <CardDescription>Story points completed per sprint</CardDescription>
          </CardHeader>
          <CardContent>
            <VelocityChart velocities={stats.velocities} sprints={sprints.filter(s => s.status === "COMPLETED")} />
          </CardContent>
        </Card>
      )}

      {/* Cumulative Flow & Created vs Resolved Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CumulativeFlowChart tasks={tasks} days={30} />
        <CreatedVsResolvedChart tasks={tasks} days={30} />
      </div>

      {/* Status Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            Task Pipeline
          </CardTitle>
          <CardDescription>Visual flow of tasks through different stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            <PipelineStage
              label="Backlog"
              count={stats.statusDistribution.backlog}
              total={stats.totalTasks}
              color="bg-slate-500"
            />
            <PipelineConnector />
            <PipelineStage
              label="To Do"
              count={stats.statusDistribution.todo}
              total={stats.totalTasks}
              color="bg-blue-500"
            />
            <PipelineConnector />
            <PipelineStage
              label="In Progress"
              count={stats.statusDistribution.inProgress}
              total={stats.totalTasks}
              color="bg-amber-500"
            />
            <PipelineConnector />
            <PipelineStage
              label="In Review"
              count={stats.statusDistribution.inReview}
              total={stats.totalTasks}
              color="bg-purple-500"
            />
            <PipelineConnector />
            <PipelineStage
              label="Done"
              count={stats.statusDistribution.done}
              total={stats.totalTasks}
              color="bg-green-500"
              highlight
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "violet",
  highlight = false,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  color?: "violet" | "blue" | "green" | "red" | "purple" | "amber";
  highlight?: boolean;
}) {
  const colorClasses = {
    violet: "from-violet-500/10 to-purple-500/10 border-violet-500/20",
    blue: "from-blue-500/10 to-cyan-500/10 border-blue-500/20",
    green: "from-green-500/10 to-emerald-500/10 border-green-500/20",
    red: "from-red-500/10 to-rose-500/10 border-red-500/20",
    purple: "from-purple-500/10 to-pink-500/10 border-purple-500/20",
    amber: "from-amber-500/10 to-yellow-500/10 border-amber-500/20",
  };

  const iconColors = {
    violet: "text-violet-500",
    blue: "text-blue-500",
    green: "text-green-500",
    red: "text-red-500",
    purple: "text-purple-500",
    amber: "text-amber-500",
  };

  return (
    <Card className={cn(
      "bg-gradient-to-br border",
      colorClasses[color],
      highlight && "ring-2 ring-red-500/50 animate-pulse"
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={cn("p-2 rounded-lg bg-background/50", iconColors[color])}>
            {icon}
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend === "up" && "text-green-500",
              trend === "down" && "text-red-500",
              trend === "neutral" && "text-muted-foreground"
            )}>
              {trend === "up" && <TrendingUp className="h-3 w-3" />}
              {trend === "down" && <TrendingDown className="h-3 w-3" />}
            </div>
          )}
        </div>
        <div className="mt-4">
          <div className="text-3xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{title}</div>
          <div className="text-sm text-muted-foreground/80 mt-0.5">{subtitle}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Priority Bar Component
function PriorityBar({
  label,
  count,
  total,
  color,
  icon,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  icon: React.ReactNode;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1 rounded", color, "text-white")}>
            {icon}
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-semibold">{count}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Pipeline Stage Component
function PipelineStage({
  label,
  count,
  total,
  color,
  highlight = false,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  highlight?: boolean;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className={cn(
      "flex-1 min-w-[100px] p-4 rounded-xl text-center transition-all",
      "bg-muted/50 border",
      highlight && "bg-green-500/10 border-green-500/30"
    )}>
      <div className={cn("h-3 w-3 rounded-full mx-auto mb-2", color)} />
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground mt-1">{percentage}%</div>
    </div>
  );
}

// Pipeline Connector
function PipelineConnector() {
  return (
    <div className="flex-shrink-0 w-8 h-0.5 bg-border" />
  );
}

// Velocity Chart Component
function VelocityChart({
  velocities,
  sprints,
}: {
  velocities: number[];
  sprints: Sprint[];
}) {
  const maxVelocity = Math.max(...velocities, 1);

  return (
    <div className="flex items-end gap-3 h-40">
      {velocities.map((velocity, index) => {
        const height = (velocity / maxVelocity) * 100;
        const sprint = sprints[index];

        return (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center h-32">
                  <div
                    className="w-full max-w-12 bg-gradient-to-t from-violet-600 to-purple-500 rounded-t-lg transition-all hover:opacity-80"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-full">
                  {sprint?.name || `Sprint ${index + 1}`}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{sprint?.name || `Sprint ${index + 1}`}</p>
              <p className="text-sm text-muted-foreground">{velocity} points completed</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
