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
import { TaskStatus, TaskPriority, TaskType } from "@/types";
import { useTaskEventListener, useTaskStatusChange } from "@/contexts/TaskEventContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, User, LayoutGrid, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
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
}

const columns: { id: TaskStatus; title: string }[] = [
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "IN_REVIEW", title: "In Review" },
  { id: "MERGED", title: "Merged" },
];

export function KanbanBoard({ tasks: initialTasks, projectId, projectKey, wipLimits = {}, members = [] }: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [groupByAssignee, setGroupByAssignee] = useState(false);
  const isDraggingRef = useRef(false);
  const { emitStatusChange } = useTaskStatusChange();

  // Deduplicate members by id
  const uniqueMembers = useMemo(() => {
    const seen = new Set<string>();
    return members.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [members]);

  // Get filtered tasks based on selected assignee
  const filteredTasks = useMemo(() => {
    if (!selectedAssignee) return tasks;
    if (selectedAssignee === "unassigned") {
      return tasks.filter((t) => !t.assignee);
    }
    return tasks.filter((t) => t.assignee?.id === selectedAssignee);
  }, [tasks, selectedAssignee]);

  // Group tasks by assignee when groupByAssignee is enabled
  const groupedTasks = useMemo(() => {
    if (!groupByAssignee) return null;

    const groups: { assignee: Member | null; tasks: Task[] }[] = [];
    const assigneeMap = new Map<string | null, Task[]>();

    // Group tasks by assignee
    for (const task of filteredTasks) {
      const assigneeId = task.assignee?.id || null;
      if (!assigneeMap.has(assigneeId)) {
        assigneeMap.set(assigneeId, []);
      }
      assigneeMap.get(assigneeId)!.push(task);
    }

    // Build groups array - unassigned first, then by member order
    if (assigneeMap.has(null)) {
      groups.push({ assignee: null, tasks: assigneeMap.get(null)! });
    }

    for (const member of uniqueMembers) {
      if (assigneeMap.has(member.id)) {
        groups.push({ assignee: member, tasks: assigneeMap.get(member.id)! });
      }
    }

    return groups;
  }, [filteredTasks, groupByAssignee, uniqueMembers]);

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

  async function handleDragEnd(event: DragEndEvent) {
    isDraggingRef.current = false;
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    const task = tasks.find((t) => t.id === activeTaskId);
    if (!task || task.status === newStatus) return;

    // Optimistically update the UI
    setTasks((prev) =>
      prev.map((t) => (t.id === activeTaskId ? { ...t, status: newStatus } : t))
    );

    // Update the task status in the database
    try {
      const response = await fetch(`/api/tasks/${activeTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Emit event for other components to sync
        emitStatusChange(activeTaskId, newStatus, projectId);
      } else {
        // Revert on error
        setTasks((prev) =>
          prev.map((t) => (t.id === activeTaskId ? { ...t, status: task.status } : t))
        );
      }
    } catch (error) {
      console.error("Failed to update task status:", error);
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === activeTaskId ? { ...t, status: task.status } : t))
      );
    }
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

        {/* Clear Filter Button */}
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

        <div className="flex-1" />

        {/* Group by Assignee Toggle */}
        <Button
          variant={groupByAssignee ? "default" : "outline"}
          size="sm"
          onClick={() => setGroupByAssignee(!groupByAssignee)}
          aria-label="Group by assignee"
          className={cn(
            "h-8 gap-2",
            groupByAssignee && "bg-primary text-primary-foreground"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="text-xs">Swimlanes</span>
        </Button>

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
          {groupByAssignee && groupedTasks ? (
            // Swimlane View - grouped by assignee
            <div className="space-y-6 p-4">
              {groupedTasks.map((group) => (
                <div key={group.assignee?.id || "unassigned"} className="space-y-2">
                  {/* Swimlane Header */}
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 rounded-lg sticky top-0 z-10">
                    {group.assignee ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={group.assignee.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {group.assignee.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{group.assignee.name}</span>
                      </>
                    ) : (
                      <>
                        <User className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-muted-foreground">Unassigned</span>
                      </>
                    )}
                    <span className="text-sm text-muted-foreground ml-2">
                      ({group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"})
                    </span>
                  </div>
                  {/* Swimlane Columns */}
                  <div className="grid grid-cols-4 gap-6" data-tour-id="kanban-board">
                    {columns.map((column) => (
                      <KanbanColumn
                        key={`${group.assignee?.id || "unassigned"}-${column.id}`}
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
            <div className="grid grid-cols-4 gap-6 h-full min-w-fit p-4" data-tour-id="kanban-board">
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
    </div>
  );
}
