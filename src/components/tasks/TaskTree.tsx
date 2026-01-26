"use client";

import { useState, useEffect } from "react";
import { EpicView } from "./EpicView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Layers } from "lucide-react";
import { TaskStatus, TaskPriority, TaskType } from "@/types";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: TaskType;
  storyPoints: number | null;
  projectId: string;
  parentTaskId: string | null;
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  subtasks?: Task[];
}

interface TaskTreeProps {
  projectId: string;
}

export function TaskTree({ projectId }: TaskTreeProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        // Fetch all tasks for the project
        const response = await fetch(`/api/tasks?projectId=${projectId}`);
        if (response.ok) {
          const data = await response.json();
          setTasks(data.tasks);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Build hierarchical structure
  const epics = tasks.filter((t) => t.taskType === "EPIC" && !t.parentTaskId);

  // For each epic, find its stories
  const epicsWithStories = epics.map((epic) => {
    const stories = tasks.filter(
      (t) =>
        t.parentTaskId === epic.id &&
        (t.taskType === "STORY" || t.taskType === "BUG")
    );

    // For each story, find its subtasks
    const storiesWithSubtasks = stories.map((story) => ({
      ...story,
      subtasks: tasks.filter(
        (t) => t.parentTaskId === story.id
      ),
    }));

    return {
      epic,
      stories: storiesWithSubtasks,
    };
  });

  // Find orphan stories (stories without an epic parent)
  const orphanStories = tasks.filter(
    (t) =>
      (t.taskType === "STORY" || t.taskType === "BUG") &&
      !t.parentTaskId
  );

  const orphanStoriesWithSubtasks = orphanStories.map((story) => ({
    ...story,
    subtasks: tasks.filter((t) => t.parentTaskId === story.id),
  }));

  // Find standalone tasks (tasks without parent)
  const standaloneTasks = tasks.filter(
    (t) =>
      t.taskType === "TASK" &&
      !t.parentTaskId
  );

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No tasks yet. Create some tasks to see the hierarchy view.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Epics with their stories */}
      {epicsWithStories.map(({ epic, stories }) => (
        <EpicView
          key={epic.id}
          epic={epic}
          stories={stories}
          projectId={projectId}
        />
      ))}

      {/* Orphan stories (if any) */}
      {orphanStoriesWithSubtasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Unassigned Stories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orphanStoriesWithSubtasks.map((story) => (
                <div
                  key={story.id}
                  className="flex items-center gap-2 py-2 px-2 hover:bg-accent/50 rounded-md"
                >
                  <a
                    href={`/project/${projectId}/task/${story.id}`}
                    className="flex-1 text-sm hover:underline"
                  >
                    {story.title}
                  </a>
                  {story.subtasks && story.subtasks.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {story.subtasks.length} subtasks
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Standalone tasks (if any) */}
      {standaloneTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Standalone Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {standaloneTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 py-2 px-2 hover:bg-accent/50 rounded-md"
                >
                  <a
                    href={`/project/${projectId}/task/${task.id}`}
                    className="flex-1 text-sm hover:underline"
                  >
                    {task.title}
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
