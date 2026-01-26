"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

interface KanbanBoardProps {
  tasks: Task[];
  projectId: string;
}

const columns: { id: TaskStatus; title: string }[] = [
  { id: "BACKLOG", title: "Backlog" },
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "GENERATING", title: "Generating" },
  { id: "PR_OPEN", title: "PR Open" },
  { id: "IN_REVIEW", title: "In Review" },
  { id: "MERGED", title: "Merged" },
];

export function KanbanBoard({ tasks: initialTasks, projectId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const isDraggingRef = useRef(false);

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

      if (!response.ok) {
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

  function getTasksByStatus(status: TaskStatus) {
    return tasks.filter((task) => task.status === status);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto p-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={getTasksByStatus(column.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
