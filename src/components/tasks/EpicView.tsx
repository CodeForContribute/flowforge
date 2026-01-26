"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TaskTypeBadge } from "./TaskTypeBadge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Rocket,
} from "lucide-react";
import { TaskStatus, TaskPriority, TaskType } from "@/types";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: TaskType;
  storyPoints: number | null;
  projectId: string;
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  subtasks?: Task[];
}

interface EpicViewProps {
  epic: Task;
  stories: Task[];
  projectId: string;
}

function StoryRow({ story, projectId }: { story: Task; projectId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasSubtasks = story.subtasks && story.subtasks.length > 0;

  const completedSubtasks =
    story.subtasks?.filter(
      (t) => t.status === "MERGED" || t.status === "CLOSED"
    ).length || 0;
  const totalSubtasks = story.subtasks?.length || 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-l-2 border-muted pl-4 ml-4">
        <div className="flex items-center gap-2 py-2 hover:bg-accent/50 rounded-r-md px-2 -ml-2">
          {hasSubtasks ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-6" />
          )}

          <TaskTypeBadge type={story.taskType} size="sm" showLabel={false} />

          <Link
            href={`/project/${projectId}/task/${story.id}`}
            className="flex-1 text-sm hover:underline truncate"
          >
            {story.title}
          </Link>

          {hasSubtasks && (
            <span className="text-xs text-muted-foreground">
              {completedSubtasks}/{totalSubtasks}
            </span>
          )}

          {story.storyPoints && (
            <Badge variant="outline" className="text-xs">
              {story.storyPoints}pts
            </Badge>
          )}

          <StatusBadge status={story.status} size="sm" />

          {story.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarImage src={story.assignee.image || undefined} />
              <AvatarFallback className="text-xs">
                {story.assignee.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        <CollapsibleContent>
          {story.subtasks?.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-2 py-1.5 pl-8 hover:bg-accent/50 rounded-r-md"
            >
              <TaskTypeBadge type={subtask.taskType} size="sm" showLabel={false} />

              <Link
                href={`/project/${projectId}/task/${subtask.id}`}
                className="flex-1 text-sm hover:underline truncate"
              >
                {subtask.title}
              </Link>

              {subtask.storyPoints && (
                <Badge variant="outline" className="text-xs">
                  {subtask.storyPoints}pts
                </Badge>
              )}

              <StatusBadge status={subtask.status} size="sm" />

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
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function EpicView({ epic, stories, projectId }: EpicViewProps) {
  const [isOpen, setIsOpen] = useState(true);

  const allTasks = [
    ...stories,
    ...stories.flatMap((s) => s.subtasks || []),
  ];

  const completedCount = allTasks.filter(
    (t) => t.status === "MERGED" || t.status === "CLOSED"
  ).length;

  const totalPoints = allTasks.reduce(
    (sum, t) => sum + (t.storyPoints || 0),
    0
  );
  const completedPoints = allTasks
    .filter((t) => t.status === "MERGED" || t.status === "CLOSED")
    .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  const progress =
    allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 0;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <Rocket className="h-5 w-5 text-purple-500" />

              <Link
                href={`/project/${projectId}/task/${epic.id}`}
                className="hover:underline"
              >
                <CardTitle className="text-lg">{epic.title}</CardTitle>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {epic.storyPoints && (
                <Badge variant="outline">{epic.storyPoints}pts</Badge>
              )}
              <StatusBadge status={epic.status} />
            </div>
          </div>

          <div className="ml-12 space-y-2 mt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {completedCount}/{allTasks.length} tasks complete
              </span>
              {totalPoints > 0 && (
                <span className="text-muted-foreground">
                  {completedPoints}/{totalPoints} pts
                </span>
              )}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {stories.length === 0 ? (
              <p className="text-sm text-muted-foreground ml-12 py-2">
                No stories in this epic yet.
              </p>
            ) : (
              <div className="space-y-1">
                {stories.map((story) => (
                  <StoryRow key={story.id} story={story} projectId={projectId} />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
