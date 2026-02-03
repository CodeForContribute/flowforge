"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { StatusSelect } from "@/components/common/StatusSelect";
import { TaskTypeBadge } from "./TaskTypeBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, ChevronDown, Loader2 } from "lucide-react";
import { TaskStatus, TaskPriority, TaskType } from "@/types";

interface Subtask {
  id: string;
  title: string;
  taskType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints: number | null;
  taskKey?: string;
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

interface SubtasksListProps {
  parentTaskId: string;
  projectId: string;
  projectKey?: string;
  subtasks: Subtask[];
  parentTaskType: TaskType;
}

export function SubtasksList({
  parentTaskId,
  projectId,
  projectKey,
  subtasks,
  parentTaskType,
}: SubtasksListProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Determine child task type based on parent
  const childType: TaskType =
    parentTaskType === "EPIC"
      ? "STORY"
      : parentTaskType === "STORY"
      ? "TASK"
      : "SUBTASK";

  const completedCount = subtasks.filter(
    (t) => t.status === "MERGED" || t.status === "CLOSED"
  ).length;
  const progress =
    subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  async function handleAddSubtask() {
    if (!newTitle.trim()) return;
    setIsLoading(true);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: newTitle,
          description: `Subtask of parent task`,
          taskType: childType,
          parentTaskId,
        }),
      });

      if (response.ok) {
        setNewTitle("");
        setIsAdding(false);
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create subtask");
      }
    } catch (error) {
      console.error("Error creating subtask:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 -ml-2">
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "" : "-rotate-90"
                }`}
              />
              <span className="font-medium">
                Subtasks ({completedCount}/{subtasks.length})
              </span>
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {subtasks.length > 0 && (
          <Progress value={progress} className="h-1.5 my-2" />
        )}

        <CollapsibleContent className="space-y-1">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-accent text-sm group"
            >
              <TaskTypeBadge type={subtask.taskType} size="sm" showLabel={false} />
              {subtask.taskKey && (
                <Link
                  href={`/project/${projectKey || projectId}/task/${subtask.taskKey || subtask.id}`}
                  className="text-xs font-mono text-primary/80 bg-primary/10 px-1 py-0.5 rounded shrink-0 hover:bg-primary/20 transition-colors"
                >
                  {subtask.taskKey}
                </Link>
              )}
              <Link
                href={`/project/${projectKey || projectId}/task/${subtask.taskKey || subtask.id}`}
                className="flex-1 truncate hover:text-primary transition-colors"
              >
                {subtask.title}
              </Link>
              {subtask.storyPoints && (
                <span className="text-xs text-muted-foreground">
                  {subtask.storyPoints}pts
                </span>
              )}
              <div onClick={(e) => e.stopPropagation()}>
                <StatusSelect
                  taskId={subtask.id}
                  currentStatus={subtask.status}
                  size="sm"
                  onStatusChange={() => router.refresh()}
                />
              </div>
              {subtask.assignee && (
                <Avatar className="h-5 w-5">
                  <AvatarImage src={subtask.assignee.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {subtask.assignee.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {isAdding && (
            <div className="flex gap-2 mt-2">
              <TaskTypeBadge type={childType} size="sm" showLabel={false} />
              <Input
                placeholder={`Add ${childType.toLowerCase()}...`}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-8 flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddSubtask();
                  } else if (e.key === "Escape") {
                    setIsAdding(false);
                    setNewTitle("");
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleAddSubtask}
                disabled={isLoading || !newTitle.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
            </div>
          )}

          {subtasks.length === 0 && !isAdding && (
            <p className="text-sm text-muted-foreground py-2">
              No subtasks yet. Click + to add one.
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
