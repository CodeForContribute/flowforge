"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { TaskStatus, TaskPriority, TaskType, BoardColumn, DEFAULT_BOARD_COLUMNS } from "@/types";
import { useTaskEventListener, useTaskStatusChange } from "@/contexts/TaskEventContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, User, LayoutGrid, X, ChevronDown, Zap, Layers, ArrowUpDown, AlertTriangle, GitPullRequest, Clock, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { isPast, isToday } from "date-fns";

interface QuickFilters {
  myTasks: boolean;
  highPriority: boolean;
  hasPR: boolean;
  overdue: boolean;
}

type GroupByMode = "none" | "assignee" | "priority" | "epic";

const priorityOrder: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
const priorityConfig: Record<TaskPriority, { color: string; bg: string; label: string; icon: string }> = {
  URGENT: { color: "text-red-500", bg: "bg-red-500/10", label: "Urgent", icon: "🔴" },
  HIGH: { color: "text-orange-500", bg: "bg-orange-500/10", label: "High Priority", icon: "🟠" },
  MEDIUM: { color: "text-blue-500", bg: "bg-blue-500/10", label: "Medium Priority", icon: "🔵" },
  LOW: { color: "text-slate-500", bg: "bg-slate-500/10", label: "Low Priority", icon: "⚪" },
};

const POLL_INTERVAL = 5000; // 5 seconds

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType?: TaskType;
  storyPoints?: number | null;
  dueDate?: Date | string | null;
  prNumber: number | null;
  prUrl: string | null;
  projectId: string;
  taskKey?: string;
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  parentTask?: {
    id: string;
    title: string;
    taskKey: string;
    taskType: TaskType;
  } | null;
  labels?: { id: string; name: string; color: string }[];
  _count?: {
    comments: number;
    subtasks?: number;
  };
}

type WipLimits = Record<string, number>;

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface KanbanBoardProps {
  tasks: Task[];
  projectId: string;
  projectKey: string;
  wipLimits?: WipLimits;
  members?: Member[];
  boardColumns?: BoardColumn[] | null;
}

interface WipWarningState {
  isOpen: boolean;
  taskId: string;
  newStatus: TaskStatus;
  columnTitle: string;
  currentCount: number;
  limit: number;
}

export function KanbanBoard({ tasks: initialTasks, projectId, projectKey, wipLimits = {}, members = [], boardColumns }: KanbanBoardProps) {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupByMode>("none");
  const [wipWarning, setWipWarning] = useState<WipWarningState | null>(null);
  const [quickFilters, setQuickFilters] = useState<QuickFilters>({
    myTasks: false,
    highPriority: false,
    hasPR: false,
    overdue: false,
  });
  const isDraggingRef = useRef(false);
  const { emitStatusChange } = useTaskStatusChange();

  // Use custom board columns or fall back to defaults
  const columns = useMemo(() => {
    if (boardColumns && boardColumns.length > 0) {
      return [...boardColumns].sort((a, b) => a.order - b.order);
    }
    return DEFAULT_BOARD_COLUMNS;
  }, [boardColumns]);

  // Toggle a quick filter
  function toggleQuickFilter(filter: keyof QuickFilters) {
    setQuickFilters((prev) => ({ ...prev, [filter]: !prev[filter] }));
  }

  // Check if any quick filter is active
  const hasActiveQuickFilters = Object.values(quickFilters).some(Boolean);

  // Clear all quick filters
  function clearQuickFilters() {
    setQuickFilters({
      myTasks: false,
      highPriority: false,
      hasPR: false,
      overdue: false,
    });
  }

  // Deduplicate members by id
  const uniqueMembers = useMemo(() => {
    const seen = new Set<string>();
    return members.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [members]);

  // Get filtered tasks based on selected assignee and quick filters
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Assignee filter
    if (selectedAssignee) {
      if (selectedAssignee === "unassigned") {
        result = result.filter((t) => !t.assignee);
      } else {
        result = result.filter((t) => t.assignee?.id === selectedAssignee);
      }
    }

    // Quick filters (all are AND conditions)
    if (quickFilters.myTasks && session?.user?.id) {
      result = result.filter((t) => t.assignee?.id === session.user.id);
    }

    if (quickFilters.highPriority) {
      result = result.filter((t) => t.priority === "URGENT" || t.priority === "HIGH");
    }

    if (quickFilters.hasPR) {
      result = result.filter((t) => t.prNumber !== null && t.prNumber !== undefined);
    }

    if (quickFilters.overdue) {
      result = result.filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return isPast(due) && !isToday(due);
      });
    }

    return result;
  }, [tasks, selectedAssignee, quickFilters, session?.user?.id]);

  // Group tasks based on groupBy mode
  const groupedTasks = useMemo(() => {
    if (groupBy === "none") return null;

    if (groupBy === "assignee") {
      const groups: { key: string; label: string; icon?: React.ReactNode; tasks: Task[] }[] = [];
      const assigneeMap = new Map<string | null, Task[]>();

      for (const task of filteredTasks) {
        const assigneeId = task.assignee?.id || null;
        if (!assigneeMap.has(assigneeId)) {
          assigneeMap.set(assigneeId, []);
        }
        assigneeMap.get(assigneeId)!.push(task);
      }

      if (assigneeMap.has(null)) {
        groups.push({
          key: "unassigned",
          label: "Unassigned",
          icon: <User className="h-5 w-5 text-muted-foreground" />,
          tasks: assigneeMap.get(null)!,
        });
      }

      for (const member of uniqueMembers) {
        if (assigneeMap.has(member.id)) {
          groups.push({
            key: member.id,
            label: member.name || "Unknown",
            icon: (
              <Avatar className="h-6 w-6">
                <AvatarImage src={member.image || undefined} />
                <AvatarFallback className="text-xs">{member.name?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
            ),
            tasks: assigneeMap.get(member.id)!,
          });
        }
      }

      return groups;
    }

    if (groupBy === "priority") {
      const groups: { key: string; label: string; icon?: React.ReactNode; tasks: Task[] }[] = [];
      const priorityMap = new Map<TaskPriority, Task[]>();

      for (const task of filteredTasks) {
        if (!priorityMap.has(task.priority)) {
          priorityMap.set(task.priority, []);
        }
        priorityMap.get(task.priority)!.push(task);
      }

      for (const priority of priorityOrder) {
        if (priorityMap.has(priority)) {
          const config = priorityConfig[priority];
          groups.push({
            key: priority,
            label: config.label,
            icon: <span className="text-base">{config.icon}</span>,
            tasks: priorityMap.get(priority)!,
          });
        }
      }

      return groups;
    }

    if (groupBy === "epic") {
      const groups: { key: string; label: string; icon?: React.ReactNode; tasks: Task[] }[] = [];
      const epicMap = new Map<string | null, { epic: Task["parentTask"]; tasks: Task[] }>();

      for (const task of filteredTasks) {
        const epicKey = task.parentTask?.id || null;
        if (!epicMap.has(epicKey)) {
          epicMap.set(epicKey, { epic: task.parentTask, tasks: [] });
        }
        epicMap.get(epicKey)!.tasks.push(task);
      }

      // No parent first
      if (epicMap.has(null)) {
        groups.push({
          key: "no-epic",
          label: "No Parent",
          icon: <Layers className="h-5 w-5 text-muted-foreground" />,
          tasks: epicMap.get(null)!.tasks,
        });
      }

      // Then epics
      Array.from(epicMap.entries()).forEach(([key, { epic, tasks }]) => {
        if (key !== null && epic) {
          groups.push({
            key: key,
            label: `${epic.taskKey}: ${epic.title}`,
            icon: epic.taskType === "EPIC" ? <span className="text-base">⚡</span> : <span className="text-base">📖</span>,
            tasks,
          });
        }
      });

      return groups;
    }

    return null;
  }, [filteredTasks, groupBy, uniqueMembers]);

  const selectedMember = uniqueMembers.find((m) => m.id === selectedAssignee);

  // Fetch latest tasks from API
  const fetchTasks = useCallback(async () => {
    // Don't fetch while dragging to avoid state conflicts
    if (isDraggingRef.current) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  }, [projectId]);

  // Listen for task status changes from other components
  useTaskEventListener(
    (event) => {
      if (event.type === "status_changed" && event.data?.status) {
        // Update the task in local state
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

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(fetchTasks, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    isDraggingRef.current = true;
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  }

  // Actually perform the task move
  const performMove = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistically update the UI
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    // Update the task status in the database
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Emit event for other components to sync
        emitStatusChange(taskId, newStatus, projectId);
      } else {
        // Revert on error
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
        );
      }
    } catch (error) {
      console.error("Failed to update task status:", error);
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      );
    }
  }, [tasks, emitStatusChange, projectId]);

  async function handleDragEnd(event: DragEndEvent) {
    isDraggingRef.current = false;
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    const task = tasks.find((t) => t.id === activeTaskId);
    if (!task || task.status === newStatus) return;

    // Check WIP limit
    const wipLimit = wipLimits[newStatus];
    if (wipLimit !== undefined && wipLimit > 0) {
      const currentCount = tasks.filter((t) => t.status === newStatus).length;
      if (currentCount >= wipLimit) {
        // Show warning dialog
        const column = columns.find((c) => c.id === newStatus);
        setWipWarning({
          isOpen: true,
          taskId: activeTaskId,
          newStatus,
          columnTitle: column?.title || newStatus,
          currentCount,
          limit: wipLimit,
        });
        return;
      }
    }

    // No limit exceeded, perform the move
    performMove(activeTaskId, newStatus);
  }

  // Handle WIP warning confirmation
  function handleWipWarningConfirm() {
    if (wipWarning) {
      performMove(wipWarning.taskId, wipWarning.newStatus);
      setWipWarning(null);
    }
  }

  function handleWipWarningCancel() {
    setWipWarning(null);
  }

  function getTasksByStatus(status: TaskStatus, taskList: Task[] = filteredTasks) {
    return taskList.filter((task) => task.status === status);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter Bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
        </div>

        {/* Assignee Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2">
              {selectedAssignee ? (
                selectedAssignee === "unassigned" ? (
                  <>
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Unassigned</span>
                  </>
                ) : (
                  <>
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={selectedMember?.image || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {selectedMember?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span>{selectedMember?.name || "Unknown"}</span>
                  </>
                )
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  <span>All Assignees</span>
                </>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => setSelectedAssignee(null)}>
              <Users className="h-4 w-4 mr-2" />
              All Assignees
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedAssignee("unassigned")}>
              <User className="h-4 w-4 mr-2 text-muted-foreground" />
              Unassigned
            </DropdownMenuItem>
            {uniqueMembers.length > 0 && <DropdownMenuSeparator />}
            {uniqueMembers.map((member) => (
              <DropdownMenuItem
                key={member.id}
                onClick={() => setSelectedAssignee(member.id)}
              >
                <Avatar className="h-5 w-5 mr-2">
                  <AvatarImage src={member.image || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {member.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                {member.name || "Unknown"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Assignee Filter Button */}
        {selectedAssignee && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => setSelectedAssignee(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Quick Filter Toggles */}
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground mr-1">Quick:</span>

          {session?.user?.id && (
            <Button
              variant={quickFilters.myTasks ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-7 text-xs px-2",
                quickFilters.myTasks && "bg-blue-600 hover:bg-blue-700"
              )}
              onClick={() => toggleQuickFilter("myTasks")}
            >
              <User className="h-3 w-3 mr-1" />
              My Tasks
            </Button>
          )}

          <Button
            variant={quickFilters.highPriority ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-7 text-xs px-2",
              quickFilters.highPriority && "bg-orange-600 hover:bg-orange-700"
            )}
            onClick={() => toggleQuickFilter("highPriority")}
          >
            <Flame className="h-3 w-3 mr-1" />
            High Priority
          </Button>

          <Button
            variant={quickFilters.hasPR ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-7 text-xs px-2",
              quickFilters.hasPR && "bg-green-600 hover:bg-green-700"
            )}
            onClick={() => toggleQuickFilter("hasPR")}
          >
            <GitPullRequest className="h-3 w-3 mr-1" />
            Has PR
          </Button>

          <Button
            variant={quickFilters.overdue ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-7 text-xs px-2",
              quickFilters.overdue && "bg-red-600 hover:bg-red-700"
            )}
            onClick={() => toggleQuickFilter("overdue")}
          >
            <Clock className="h-3 w-3 mr-1" />
            Overdue
          </Button>

          {hasActiveQuickFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={clearQuickFilters}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex-1" />

        {/* Group By / Swimlanes Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={groupBy !== "none" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-8 gap-2",
                groupBy !== "none" && "bg-primary text-primary-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="text-xs">
                {groupBy === "none" ? "Swimlanes" :
                  groupBy === "assignee" ? "By Assignee" :
                  groupBy === "priority" ? "By Priority" : "By Epic"}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Group by
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByMode)}>
              <DropdownMenuRadioItem value="none">
                <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
                No Grouping
              </DropdownMenuRadioItem>
              <DropdownMenuSeparator />
              <DropdownMenuRadioItem value="assignee">
                <Users className="h-4 w-4 mr-2" />
                By Assignee
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="priority">
                <Zap className="h-4 w-4 mr-2" />
                By Priority
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="epic">
                <Layers className="h-4 w-4 mr-2" />
                By Epic/Parent
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Task Count */}
        <div className="text-sm text-muted-foreground">
          {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
        </div>
      </div>

      {/* Board Content */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-auto">
          {groupBy !== "none" && groupedTasks ? (
            // Swimlane View - grouped by selected mode
            <div className="space-y-6 p-4">
              {groupedTasks.map((group) => (
                <div key={group.key} className="space-y-2">
                  {/* Swimlane Header */}
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg sticky top-0 z-10 border",
                    groupBy === "priority" && priorityConfig[group.key as TaskPriority]?.bg,
                    groupBy !== "priority" && "bg-muted/50"
                  )}>
                    {group.icon}
                    <span className={cn(
                      "font-medium",
                      groupBy === "priority" && priorityConfig[group.key as TaskPriority]?.color
                    )}>
                      {group.label}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"})
                    </span>
                  </div>
                  {/* Swimlane Columns */}
                  <div
                    className="grid gap-6"
                    style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(250px, 1fr))` }}
                    data-tour-id="kanban-board"
                  >
                    {columns.map((column) => (
                      <KanbanColumn
                        key={`${group.key}-${column.id}`}
                        id={column.id}
                        title={column.title}
                        tasks={getTasksByStatus(column.id, group.tasks)}
                        projectKey={projectKey}
                        wipLimit={wipLimits[column.id]}
                        compact
                      />
                    ))}
                  </div>
                </div>
              ))}
              {groupedTasks.length === 0 && (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  No tasks found
                </div>
              )}
            </div>
          ) : (
            // Standard View
            <div
              className="grid gap-6 h-full min-w-fit p-4"
              style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(250px, 1fr))` }}
              data-tour-id="kanban-board"
            >
              {columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  tasks={getTasksByStatus(column.id)}
                  projectKey={projectKey}
                  wipLimit={wipLimits[column.id]}
                />
              ))}
            </div>
          )}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-3 scale-105">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* WIP Limit Warning Dialog */}
      <AlertDialog open={wipWarning?.isOpen || false} onOpenChange={(open) => !open && handleWipWarningCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              WIP Limit Exceeded
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                The <strong>{wipWarning?.columnTitle}</strong> column has a work-in-progress limit of{" "}
                <strong>{wipWarning?.limit}</strong> tasks, and currently has{" "}
                <strong>{wipWarning?.currentCount}</strong>.
              </p>
              <p>
                Moving this task will exceed the limit. This may indicate the team is taking on too much work at once.
              </p>
              <p className="text-muted-foreground text-sm">
                Consider completing existing tasks first, or proceed if this is intentional.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleWipWarningCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWipWarningConfirm}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Move Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
