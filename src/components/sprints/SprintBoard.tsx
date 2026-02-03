"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTaskEventListener } from "@/contexts/TaskEventContext";
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
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TaskCard } from "@/components/tasks/TaskCard";
import { AIPlanDialog, AIRetroView, RiskDashboard } from "@/components/sprint";
import { TaskPriority, TaskStatus, SprintStatus, TaskType } from "@/types";
import { format } from "date-fns";
import { Calendar, Target } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: TaskType;
  storyPoints: number | null;
  prNumber: number | null;
  prUrl: string | null;
  projectId: string;
  sprintId: string | null;
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  labels?: { id: string; name: string; color: string }[];
  _count?: {
    comments: number;
    subtasks: number;
  };
}

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  startDate: Date | string;
  endDate: Date | string;
  status: SprintStatus;
  projectId: string;
  stats: {
    totalTasks: number;
    completedTasks: number;
    totalPoints: number;
    completedPoints: number;
    progress: number;
  };
}

interface SprintBoardProps {
  sprint: Sprint;
  projectKey?: string;
  sprintTasks: Task[];
  backlogTasks: Task[];
}

function DroppableColumn({
  id,
  title,
  tasks,
  children,
}: {
  id: string;
  title: string;
  tasks: Task[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full min-h-[400px] rounded-lg border ${
        isOver ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <div className="p-3 border-b bg-muted/50">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{title}</h3>
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </div>
  );
}

export function SprintBoard({
  sprint,
  projectKey,
  sprintTasks: initialSprintTasks,
  backlogTasks: initialBacklogTasks,
}: SprintBoardProps) {
  const router = useRouter();
  const [sprintTasks, setSprintTasks] = useState(initialSprintTasks);
  const [backlogTasks, setBacklogTasks] = useState(initialBacklogTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Listen for task status changes from other components
  useTaskEventListener(
    (event) => {
      if (event.type === "status_changed" && event.data?.status) {
        const newStatus = event.data.status as TaskStatus;
        setSprintTasks((prev) =>
          prev.map((t) =>
            t.id === event.taskId ? { ...t, status: newStatus } : t
          )
        );
        setBacklogTasks((prev) =>
          prev.map((t) =>
            t.id === event.taskId ? { ...t, status: newStatus } : t
          )
        );
      }
    },
    [setSprintTasks, setBacklogTasks]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const task =
      sprintTasks.find((t) => t.id === active.id) ||
      backlogTasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    // Determine if we're moving to sprint or backlog
    const isMovingToSprint = overId === "sprint" || sprintTasks.some((t) => t.id === overId);
    const isMovingToBacklog = overId === "backlog" || backlogTasks.some((t) => t.id === overId);

    const task =
      sprintTasks.find((t) => t.id === activeTaskId) ||
      backlogTasks.find((t) => t.id === activeTaskId);

    if (!task) return;

    const wasInSprint = sprintTasks.some((t) => t.id === activeTaskId);
    const newSprintId = isMovingToSprint ? sprint.id : null;

    // No change needed
    if ((wasInSprint && isMovingToSprint) || (!wasInSprint && isMovingToBacklog)) {
      return;
    }

    // Optimistically update the UI
    if (isMovingToSprint) {
      setBacklogTasks((prev) => prev.filter((t) => t.id !== activeTaskId));
      setSprintTasks((prev) => [...prev, { ...task, sprintId: sprint.id }]);
    } else {
      setSprintTasks((prev) => prev.filter((t) => t.id !== activeTaskId));
      setBacklogTasks((prev) => [...prev, { ...task, sprintId: null }]);
    }

    // Update the task in the database
    try {
      const response = await fetch(`/api/tasks/${activeTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId: newSprintId }),
      });

      if (!response.ok) {
        // Revert on error
        if (isMovingToSprint) {
          setSprintTasks((prev) => prev.filter((t) => t.id !== activeTaskId));
          setBacklogTasks((prev) => [...prev, task]);
        } else {
          setBacklogTasks((prev) => prev.filter((t) => t.id !== activeTaskId));
          setSprintTasks((prev) => [...prev, task]);
        }
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update task sprint:", error);
      // Revert on error
      if (isMovingToSprint) {
        setSprintTasks((prev) => prev.filter((t) => t.id !== activeTaskId));
        setBacklogTasks((prev) => [...prev, task]);
      } else {
        setBacklogTasks((prev) => prev.filter((t) => t.id !== activeTaskId));
        setSprintTasks((prev) => [...prev, task]);
      }
    }
  }

  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);

  return (
    <div className="space-y-4" data-tour-id="sprint-board">
      {/* Sprint Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">{sprint.name}</CardTitle>
                {/* AI Actions Toolbar */}
                <div className="flex items-center gap-2">
                  {(sprint.status === "PLANNING" || sprint.status === "ACTIVE") && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div data-tour-id="ai-plan-button">
                          <AIPlanDialog
                            sprintId={sprint.id}
                            sprintName={sprint.name}
                            sprintStatus={sprint.status}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Use AI to suggest optimal task selection based on team capacity and velocity</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {sprint.status === "ACTIVE" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <RiskDashboard
                            sprintId={sprint.id}
                            sprintName={sprint.name}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>View AI-powered risk assessment for sprint success probability</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {sprint.status === "COMPLETED" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <AIRetroView
                            sprintId={sprint.id}
                            sprintName={sprint.name}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Generate AI insights from sprint data</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              {sprint.goal && (
                <div className="flex items-start gap-2 mt-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>{sprint.goal}</p>
                </div>
              )}
            </div>
            <Badge variant={sprint.status === "ACTIVE" ? "default" : "secondary"}>
              {sprint.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {sprint.stats.completedTasks}/{sprint.stats.totalTasks} tasks
                  {sprint.stats.totalPoints > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({sprint.stats.completedPoints}/{sprint.stats.totalPoints} pts)
                    </span>
                  )}
                </span>
              </div>
              <Progress value={sprint.stats.progress} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sprint Planning Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-2 gap-4 h-[600px]">
          <DroppableColumn id="backlog" title="Backlog" tasks={backlogTasks}>
            {backlogTasks.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No tasks in backlog
              </div>
            ) : (
              backlogTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </DroppableColumn>

          <DroppableColumn id="sprint" title={`${sprint.name}`} tasks={sprintTasks}>
            {sprintTasks.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Drag tasks here to add to sprint
              </div>
            ) : (
              sprintTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </DroppableColumn>
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
