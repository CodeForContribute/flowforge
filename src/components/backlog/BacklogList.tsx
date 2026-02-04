"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTaskEventListener } from "@/contexts/TaskEventContext";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { TaskTypeBadge } from "@/components/tasks/TaskTypeBadge";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import {
  Target,
  Loader2,
  Layers,
  ListFilter,
  LayoutGrid,
  Table2,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MessageSquare,
  GitPullRequest,
  ArrowUpRight,
  Zap,
  X,
  Plus,
} from "lucide-react";
import { TaskStatus, TaskPriority, TaskType, SprintStatus } from "@/types";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, formatDistanceToNow } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: TaskType;
  storyPoints: number | null;
  dueDate: Date | null;
  projectId: string;
  taskKey?: string;
  prNumber?: number | null;
  prUrl?: string | null;
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  labels: { id: string; name: string; color: string }[];
  _count: {
    comments: number;
    subtasks: number;
  };
}

interface Sprint {
  id: string;
  name: string;
  status: SprintStatus;
}

interface BacklogListProps {
  tasks: Task[];
  sprints: Sprint[];
  projectId: string;
  projectKey?: string;
}

type ViewMode = "list" | "compact" | "grouped";
type GroupBy = "priority" | "type" | "status" | "none";

const priorityOrder: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
const priorityConfig: Record<TaskPriority, { color: string; bg: string; label: string }> = {
  URGENT: { color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", label: "Urgent" },
  HIGH: { color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20", label: "High Priority" },
  MEDIUM: { color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", label: "Medium Priority" },
  LOW: { color: "text-slate-500", bg: "bg-slate-500/10 border-slate-500/20", label: "Low Priority" },
};

const typeConfig: Record<TaskType, { icon: string; label: string }> = {
  EPIC: { icon: "⚡", label: "Epics" },
  STORY: { icon: "📖", label: "Stories" },
  TASK: { icon: "✅", label: "Tasks" },
  SUBTASK: { icon: "📋", label: "Subtasks" },
  BUG: { icon: "🐛", label: "Bugs" },
};

export function BacklogList({ tasks: initialTasks, sprints, projectId, projectKey }: BacklogListProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [groupBy, setGroupBy] = useState<GroupBy>("priority");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["URGENT", "HIGH", "MEDIUM", "LOW", "EPIC", "STORY", "TASK", "SUBTASK", "BUG"]));

  // Update tasks when filter changes
  useEffect(() => {
    setTasks(initialTasks);
    setSelectedTasks(new Set());
  }, [initialTasks]);

  // Listen for task status changes from other components
  useTaskEventListener(
    (event) => {
      if (event.type === "status_changed" && event.data?.status) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === event.taskId
              ? { ...t, status: event.data!.status as TaskStatus }
              : t
          )
        );
      }
    },
    [setTasks]
  );

  // Calculate stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const urgent = tasks.filter(t => t.priority === "URGENT").length;
    const overdue = tasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))).length;
    const unestimated = tasks.filter(t => !t.storyPoints).length;
    return { total, totalPoints, urgent, overdue, unestimated };
  }, [tasks]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    if (groupBy === "none") {
      return { "All Tasks": tasks };
    }

    const groups: Record<string, Task[]> = {};

    if (groupBy === "priority") {
      priorityOrder.forEach(p => {
        const filtered = tasks.filter(t => t.priority === p);
        if (filtered.length > 0) {
          groups[p] = filtered;
        }
      });
    } else if (groupBy === "type") {
      (["EPIC", "STORY", "TASK", "SUBTASK", "BUG"] as TaskType[]).forEach(type => {
        const filtered = tasks.filter(t => t.taskType === type);
        if (filtered.length > 0) {
          groups[type] = filtered;
        }
      });
    } else if (groupBy === "status") {
      const statusOrder: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "GENERATING", "PR_OPEN", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED", "MERGED", "CLOSED"];
      statusOrder.forEach(status => {
        const filtered = tasks.filter(t => t.status === status);
        if (filtered.length > 0) {
          groups[status] = filtered;
        }
      });
    }

    return groups;
  }, [tasks, groupBy]);

  function toggleTaskSelection(taskId: string) {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  function selectAll() {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map((t) => t.id)));
    }
  }

  function toggleGroup(groupKey: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }

  async function assignToSprint(sprintId: string) {
    if (selectedTasks.size === 0) return;
    setIsAssigning(true);

    try {
      await Promise.all(
        Array.from(selectedTasks).map((taskId) =>
          fetch(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sprintId }),
          })
        )
      );

      setTasks((prev) => prev.filter((t) => !selectedTasks.has(t.id)));
      setSelectedTasks(new Set());
      router.refresh();
    } catch (error) {
      console.error("Error assigning tasks:", error);
      alert("Failed to assign some tasks");
    } finally {
      setIsAssigning(false);
    }
  }

  function getGroupLabel(key: string): string {
    if (groupBy === "priority") {
      return priorityConfig[key as TaskPriority]?.label || key;
    }
    if (groupBy === "type") {
      return `${typeConfig[key as TaskType]?.icon || ""} ${typeConfig[key as TaskType]?.label || key}`;
    }
    return key.replace(/_/g, " ");
  }

  function getGroupStats(groupTasks: Task[]) {
    const points = groupTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    return { count: groupTasks.length, points };
  }

  return (
    <div className="space-y-6" data-testid="backlog-list">
      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 rounded-xl p-4 border border-violet-500/20">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
            <Layers className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total</span>
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">tasks in backlog</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 rounded-xl p-4 border border-blue-500/20">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <Target className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Points</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalPoints}</div>
          <div className="text-xs text-muted-foreground">story points</div>
        </div>

        {stats.urgent > 0 && (
          <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 dark:from-red-500/20 dark:to-orange-500/20 rounded-xl p-4 border border-red-500/20">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Urgent</span>
            </div>
            <div className="text-2xl font-bold">{stats.urgent}</div>
            <div className="text-xs text-muted-foreground">need attention</div>
          </div>
        )}

        {stats.overdue > 0 && (
          <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 dark:from-amber-500/20 dark:to-yellow-500/20 rounded-xl p-4 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Overdue</span>
            </div>
            <div className="text-2xl font-bold">{stats.overdue}</div>
            <div className="text-xs text-muted-foreground">past due date</div>
          </div>
        )}

        {stats.unestimated > 0 && (
          <div className="bg-gradient-to-br from-slate-500/10 to-gray-500/10 dark:from-slate-500/20 dark:to-gray-500/20 rounded-xl p-4 border border-slate-500/20">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Unestimated</span>
            </div>
            <div className="text-2xl font-bold">{stats.unestimated}</div>
            <div className="text-xs text-muted-foreground">need estimation</div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <TaskFilters projectId={projectId} />

        <div className="flex items-center gap-2">
          {/* Group By */}
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-40 h-9">
              <ListFilter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Group by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">By Priority</SelectItem>
              <SelectItem value="type">By Type</SelectItem>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="none">No Grouping</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode */}
          <div className="flex items-center border rounded-lg p-1 bg-muted/50">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("list")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "compact" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("compact")}
            >
              <Table2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTasks.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-xl animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="font-semibold">{selectedTasks.size}</span>
              <span className="text-muted-foreground ml-1">tasks selected</span>
            </div>
          </div>

          <div className="flex-1" />

          <Select onValueChange={assignToSprint} disabled={isAssigning}>
            <SelectTrigger className="w-52 bg-background">
              <Target className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Move to sprint..." />
            </SelectTrigger>
            <SelectContent>
              {sprints.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No active sprints
                </div>
              ) : (
                sprints.map((sprint) => (
                  <SelectItem key={sprint.id} value={sprint.id}>
                    <div className="flex items-center gap-2">
                      <Target className="h-3 w-3" />
                      {sprint.name}
                      {sprint.status === "ACTIVE" && (
                        <Badge variant="default" className="text-[10px] h-4 px-1">
                          Active
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {isAssigning && <Loader2 className="h-4 w-4 animate-spin" />}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTasks(new Set())}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {/* Task List */}
      {tasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Layers className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tasks in backlog</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Tasks not assigned to a sprint will appear here. Create a new task to get started.
            </p>
            <Button asChild>
              <Link href={`/project/${projectKey || projectId}/task/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTasks).map(([groupKey, groupTasks]) => {
            const isExpanded = expandedGroups.has(groupKey);
            const groupStats = getGroupStats(groupTasks);
            const isSelected = groupTasks.every(t => selectedTasks.has(t.id));
            const isSomeSelected = groupTasks.some(t => selectedTasks.has(t.id)) && !isSelected;

            return (
              <div key={groupKey} className="space-y-2">
                {/* Group Header */}
                {groupBy !== "none" && (
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all",
                      "hover:bg-muted/50",
                      groupBy === "priority" && priorityConfig[groupKey as TaskPriority]?.bg,
                      "border"
                    )}
                    onClick={() => toggleGroup(groupKey)}
                  >
                    <Checkbox
                      checked={isSelected}
                      // @ts-expect-error indeterminate is a valid prop
                      indeterminate={isSomeSelected}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => {
                        if (isSelected) {
                          setSelectedTasks(prev => {
                            const next = new Set(prev);
                            groupTasks.forEach(t => next.delete(t.id));
                            return next;
                          });
                        } else {
                          setSelectedTasks(prev => {
                            const next = new Set(prev);
                            groupTasks.forEach(t => next.add(t.id));
                            return next;
                          });
                        }
                      }}
                    />

                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}

                    <span className="font-semibold">{getGroupLabel(groupKey)}</span>

                    <div className="flex items-center gap-3 ml-auto text-sm text-muted-foreground">
                      <span>{groupStats.count} tasks</span>
                      <span className="text-xs">•</span>
                      <span>{groupStats.points} pts</span>
                    </div>
                  </div>
                )}

                {/* Tasks */}
                {(isExpanded || groupBy === "none") && (
                  <div className={cn("space-y-1", groupBy !== "none" && "ml-4")}>
                    {viewMode === "compact" ? (
                      <CompactTaskTable
                        tasks={groupTasks}
                        selectedTasks={selectedTasks}
                        onToggleSelection={toggleTaskSelection}
                        onSelectAll={selectAll}
                        projectKey={projectKey}
                        projectId={projectId}
                      />
                    ) : (
                      groupTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          selected={selectedTasks.has(task.id)}
                          onToggleSelection={() => toggleTaskSelection(task.id)}
                          projectKey={projectKey}
                          projectId={projectId}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Task Row Component
function TaskRow({
  task,
  selected,
  onToggleSelection,
  projectKey,
  projectId,
}: {
  task: Task;
  selected: boolean;
  onToggleSelection: () => void;
  projectKey?: string;
  projectId: string;
}) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
  const isDueToday = dueDate && isToday(dueDate);
  const taskUrl = `/project/${projectKey || projectId}/task/${task.taskKey || task.id}`;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-3 rounded-xl transition-all",
        "border bg-card hover:bg-accent/50 hover:border-primary/30",
        selected && "ring-2 ring-primary border-primary bg-primary/5",
        isOverdue && "border-l-2 border-l-destructive"
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggleSelection}
        className="shrink-0"
      />

      {/* Priority indicator */}
      <div
        className={cn(
          "w-1.5 h-8 rounded-full shrink-0",
          task.priority === "URGENT" && "bg-red-500",
          task.priority === "HIGH" && "bg-orange-500",
          task.priority === "MEDIUM" && "bg-blue-500",
          task.priority === "LOW" && "bg-slate-400"
        )}
      />

      {/* Task Key */}
      {task.taskKey && (
        <Link
          href={taskUrl}
          className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md hover:bg-primary/20 transition-colors shrink-0"
        >
          {task.taskKey}
        </Link>
      )}

      {/* Type Badge */}
      <TaskTypeBadge type={task.taskType} size="sm" showLabel={false} />

      {/* Title & Labels */}
      <div className="flex-1 min-w-0">
        <Link
          href={taskUrl}
          className={cn(
            "font-medium hover:text-primary transition-colors line-clamp-1",
            (task.status === "MERGED" || task.status === "CLOSED") && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </Link>
        {task.labels.length > 0 && (
          <div className="flex gap-1.5 mt-1">
            {task.labels.slice(0, 3).map((label) => (
              <span
                key={label.id}
                style={{ backgroundColor: `${label.color}20`, color: label.color, borderColor: `${label.color}40` }}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
              >
                {label.name}
              </span>
            ))}
            {task.labels.length > 3 && (
              <span className="text-[10px] text-muted-foreground px-1">
                +{task.labels.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status */}
      <StatusBadge status={task.status} size="sm" />

      {/* Story Points */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0",
              task.storyPoints
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {task.storyPoints || "-"}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {task.storyPoints ? `${task.storyPoints} story points` : "Not estimated"}
        </TooltipContent>
      </Tooltip>

      {/* Due Date */}
      {dueDate && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md shrink-0",
                isOverdue && "bg-destructive/10 text-destructive",
                isDueToday && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                !isOverdue && !isDueToday && "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {format(dueDate, "MMM d")}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isOverdue ? `Overdue by ${formatDistanceToNow(dueDate)}` : `Due ${format(dueDate, "MMMM d, yyyy")}`}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Meta info */}
      <div className="flex items-center gap-2 text-muted-foreground shrink-0">
        {task._count.comments > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs">
                <MessageSquare className="h-3 w-3" />
                {task._count.comments}
              </div>
            </TooltipTrigger>
            <TooltipContent>{task._count.comments} comments</TooltipContent>
          </Tooltip>
        )}

        {task.prUrl && (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={task.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <GitPullRequest className="h-3 w-3" />
                #{task.prNumber}
              </a>
            </TooltipTrigger>
            <TooltipContent>View Pull Request</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Assignee */}
      {task.assignee ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className="h-7 w-7 shrink-0 ring-2 ring-background">
              <AvatarImage src={task.assignee.image || undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {task.assignee.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>{task.assignee.name || "Unassigned"}</TooltipContent>
        </Tooltip>
      ) : (
        <div className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/30 shrink-0" />
      )}

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={taskUrl}>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              View Task
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/project/${projectKey || projectId}/task/${task.taskKey || task.id}/edit`}>
              Edit Task
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">
            Delete Task
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Compact Table View
function CompactTaskTable({
  tasks,
  selectedTasks,
  onToggleSelection,
  onSelectAll,
  projectKey,
  projectId,
}: {
  tasks: Task[];
  selectedTasks: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  projectKey?: string;
  projectId: string;
}) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="w-12 p-3">
              <Checkbox
                checked={selectedTasks.size === tasks.length && tasks.length > 0}
                onCheckedChange={onSelectAll}
              />
            </th>
            <th className="text-left p-3 font-medium text-muted-foreground">Task</th>
            <th className="w-20 p-3 font-medium text-muted-foreground">Type</th>
            <th className="w-24 p-3 font-medium text-muted-foreground">Status</th>
            <th className="w-20 p-3 font-medium text-muted-foreground">Priority</th>
            <th className="w-16 p-3 text-center font-medium text-muted-foreground">Pts</th>
            <th className="w-24 p-3 font-medium text-muted-foreground">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              className={cn(
                "border-b last:border-b-0 hover:bg-muted/30 transition-colors",
                selectedTasks.has(task.id) && "bg-primary/5"
              )}
            >
              <td className="p-3">
                <Checkbox
                  checked={selectedTasks.has(task.id)}
                  onCheckedChange={() => onToggleSelection(task.id)}
                />
              </td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  {task.taskKey && (
                    <Link
                      href={`/project/${projectKey || projectId}/task/${task.taskKey}`}
                      className="font-mono text-xs text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded hover:bg-primary/20"
                    >
                      {task.taskKey}
                    </Link>
                  )}
                  <Link
                    href={`/project/${projectKey || projectId}/task/${task.taskKey || task.id}`}
                    className="hover:text-primary transition-colors line-clamp-1"
                  >
                    {task.title}
                  </Link>
                </div>
              </td>
              <td className="p-3">
                <TaskTypeBadge type={task.taskType} size="sm" showLabel={false} />
              </td>
              <td className="p-3">
                <StatusBadge status={task.status} size="sm" />
              </td>
              <td className="p-3">
                <PriorityBadge priority={task.priority} />
              </td>
              <td className="p-3 text-center text-muted-foreground">
                {task.storyPoints || "-"}
              </td>
              <td className="p-3">
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={task.assignee.image || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {task.assignee.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs truncate max-w-16">
                      {task.assignee.name?.split(" ")[0]}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
