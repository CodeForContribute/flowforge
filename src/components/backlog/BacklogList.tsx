"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { TaskTypeBadge } from "@/components/tasks/TaskTypeBadge";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { Target, Loader2 } from "lucide-react";
import { TaskStatus, TaskPriority, TaskType, SprintStatus } from "@/types";

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
}

export function BacklogList({ tasks: initialTasks, sprints, projectId }: BacklogListProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);

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

      // Remove assigned tasks from the list
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

  return (
    <div className="space-y-4">
      <TaskFilters projectId={projectId} />

      {/* Bulk Actions */}
      {selectedTasks.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedTasks.size} selected
          </span>
          <Select onValueChange={assignToSprint} disabled={isAssigning}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Assign to sprint..." />
            </SelectTrigger>
            <SelectContent>
              {sprints.map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  <div className="flex items-center gap-2">
                    <Target className="h-3 w-3" />
                    {sprint.name}
                    <Badge
                      variant={sprint.status === "ACTIVE" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {sprint.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAssigning && <Loader2 className="h-4 w-4 animate-spin" />}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTasks(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Task List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No tasks in backlog.</p>
            <p className="text-sm mt-1">
              Tasks not assigned to a sprint will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
            <Checkbox
              checked={
                selectedTasks.size === tasks.length && tasks.length > 0
              }
              onCheckedChange={selectAll}
            />
            <span className="flex-1">Task</span>
            <span className="w-24">Type</span>
            <span className="w-24">Status</span>
            <span className="w-20">Priority</span>
            <span className="w-12 text-center">Pts</span>
            <span className="w-24">Assignee</span>
          </div>

          {/* Tasks */}
          {tasks.map((task) => (
            <Card
              key={task.id}
              className={
                selectedTasks.has(task.id)
                  ? "ring-2 ring-primary"
                  : "hover:shadow-md transition-shadow"
              }
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedTasks.has(task.id)}
                    onCheckedChange={() => toggleTaskSelection(task.id)}
                  />

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/project/${projectId}/task/${task.id}`}
                      className="font-medium hover:underline block truncate"
                    >
                      {task.title}
                    </Link>
                    {task.labels.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {task.labels.slice(0, 3).map((label) => (
                          <Badge
                            key={label.id}
                            style={{ backgroundColor: label.color }}
                            className="text-white text-xs"
                          >
                            {label.name}
                          </Badge>
                        ))}
                        {task.labels.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{task.labels.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="w-24">
                    <TaskTypeBadge type={task.taskType} size="sm" />
                  </div>

                  <div className="w-24">
                    <StatusBadge status={task.status} size="sm" />
                  </div>

                  <div className="w-20">
                    <PriorityBadge priority={task.priority} />
                  </div>

                  <div className="w-12 text-center text-sm text-muted-foreground">
                    {task.storyPoints || "-"}
                  </div>

                  <div className="w-24">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={task.assignee.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {task.assignee.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">
                          {task.assignee.name?.split(" ")[0]}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
