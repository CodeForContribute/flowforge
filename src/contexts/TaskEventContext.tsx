"use client";

import { createContext, useContext, useCallback, useRef, useEffect } from "react";

type TaskEventType = "status_changed" | "task_updated" | "task_created" | "task_deleted";

interface TaskEvent {
  type: TaskEventType;
  taskId: string;
  projectId?: string;
  data?: Record<string, unknown>;
}

type TaskEventListener = (event: TaskEvent) => void;

interface TaskEventContextValue {
  emit: (event: TaskEvent) => void;
  subscribe: (listener: TaskEventListener) => () => void;
}

const TaskEventContext = createContext<TaskEventContextValue | null>(null);

export function TaskEventProvider({ children }: { children: React.ReactNode }) {
  const listenersRef = useRef<Set<TaskEventListener>>(new Set());

  const emit = useCallback((event: TaskEvent) => {
    console.log("[TaskEvent] Emitting:", event.type, event.taskId);
    listenersRef.current.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("[TaskEvent] Error in listener:", error);
      }
    });
  }, []);

  const subscribe = useCallback((listener: TaskEventListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  return (
    <TaskEventContext.Provider value={{ emit, subscribe }}>
      {children}
    </TaskEventContext.Provider>
  );
}

export function useTaskEvents() {
  const context = useContext(TaskEventContext);
  if (!context) {
    throw new Error("useTaskEvents must be used within a TaskEventProvider");
  }
  return context;
}

/**
 * Hook to listen for task events and trigger a callback
 */
export function useTaskEventListener(
  callback: TaskEventListener,
  deps: React.DependencyList = []
) {
  const { subscribe } = useTaskEvents();

  useEffect(() => {
    const unsubscribe = subscribe(callback);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, ...deps]);
}

/**
 * Hook to emit task status change and trigger refresh
 */
export function useTaskStatusChange() {
  const { emit } = useTaskEvents();

  const emitStatusChange = useCallback(
    (taskId: string, newStatus: string, projectId?: string) => {
      emit({
        type: "status_changed",
        taskId,
        projectId,
        data: { status: newStatus },
      });
    },
    [emit]
  );

  return { emitStatusChange };
}
