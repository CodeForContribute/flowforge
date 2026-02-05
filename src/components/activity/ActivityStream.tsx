"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Plus,
  Edit,
  Trash2,
  ArrowRight,
  User,
  Target,
  MessageSquare,
  GitPullRequest,
  GitMerge,
  Tag,
  ThumbsUp,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type ActivityType =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "STATUS_CHANGED"
  | "ASSIGNEE_CHANGED"
  | "SPRINT_CHANGED"
  | "COMMENT_ADDED"
  | "PR_CREATED"
  | "PR_MERGED"
  | "LABEL_ADDED"
  | "LABEL_REMOVED"
  | "VOTE_ADDED"
  | "VOTE_REMOVED";

interface ActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  task?: {
    id: string;
    title: string;
    taskKey: string;
  } | null;
}

interface ActivityStreamProps {
  projectId: string;
  projectKey?: string;
  taskId?: string;
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
}

const activityIcons: Record<ActivityType, React.ReactNode> = {
  TASK_CREATED: <Plus className="h-3.5 w-3.5 text-green-500" />,
  TASK_UPDATED: <Edit className="h-3.5 w-3.5 text-blue-500" />,
  TASK_DELETED: <Trash2 className="h-3.5 w-3.5 text-red-500" />,
  STATUS_CHANGED: <ArrowRight className="h-3.5 w-3.5 text-purple-500" />,
  ASSIGNEE_CHANGED: <User className="h-3.5 w-3.5 text-amber-500" />,
  SPRINT_CHANGED: <Target className="h-3.5 w-3.5 text-cyan-500" />,
  COMMENT_ADDED: <MessageSquare className="h-3.5 w-3.5 text-blue-500" />,
  PR_CREATED: <GitPullRequest className="h-3.5 w-3.5 text-green-500" />,
  PR_MERGED: <GitMerge className="h-3.5 w-3.5 text-purple-500" />,
  LABEL_ADDED: <Tag className="h-3.5 w-3.5 text-indigo-500" />,
  LABEL_REMOVED: <Tag className="h-3.5 w-3.5 text-slate-500" />,
  VOTE_ADDED: <ThumbsUp className="h-3.5 w-3.5 text-green-500" />,
  VOTE_REMOVED: <ThumbsUp className="h-3.5 w-3.5 text-slate-500" />,
};

const activityColors: Record<ActivityType, string> = {
  TASK_CREATED: "bg-green-500/10 border-green-500/20",
  TASK_UPDATED: "bg-blue-500/10 border-blue-500/20",
  TASK_DELETED: "bg-red-500/10 border-red-500/20",
  STATUS_CHANGED: "bg-purple-500/10 border-purple-500/20",
  ASSIGNEE_CHANGED: "bg-amber-500/10 border-amber-500/20",
  SPRINT_CHANGED: "bg-cyan-500/10 border-cyan-500/20",
  COMMENT_ADDED: "bg-blue-500/10 border-blue-500/20",
  PR_CREATED: "bg-green-500/10 border-green-500/20",
  PR_MERGED: "bg-purple-500/10 border-purple-500/20",
  LABEL_ADDED: "bg-indigo-500/10 border-indigo-500/20",
  LABEL_REMOVED: "bg-slate-500/10 border-slate-500/20",
  VOTE_ADDED: "bg-green-500/10 border-green-500/20",
  VOTE_REMOVED: "bg-slate-500/10 border-slate-500/20",
};

export function ActivityStream({
  projectId,
  projectKey,
  taskId,
  limit = 20,
  showHeader = true,
  compact = false,
}: ActivityStreamProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchActivities = useCallback(async (cursor?: string) => {
    const isLoadMore = !!cursor;
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(cursor && { cursor }),
        ...(taskId && { taskId }),
      });

      const response = await fetch(
        `/api/projects/${projectId}/activities?${params}`
      );

      if (response.ok) {
        const data = await response.json();
        if (isLoadMore) {
          setActivities((prev) => [...prev, ...data.activities]);
        } else {
          setActivities(data.activities);
        }
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [projectId, taskId, limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  function loadMore() {
    if (nextCursor && !isLoadingMore) {
      fetchActivities(nextCursor);
    }
  }

  const content = (
    <>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No activity yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={cn(
                "flex items-start gap-3 p-2 rounded-lg transition-colors hover:bg-muted/50",
                compact && "py-1.5"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center border",
                  activityColors[activity.type]
                )}
              >
                {activityIcons[activity.type]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className={cn("text-sm", compact && "text-xs")}>
                  {activity.user && (
                    <span className="font-medium">
                      {activity.user.name || "Someone"}
                    </span>
                  )}{" "}
                  <span className="text-muted-foreground">
                    {activity.description}
                  </span>
                  {activity.task && !taskId && (
                    <>
                      {" "}
                      <Link
                        href={`/project/${projectKey || projectId}/task/${activity.task.taskKey}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {activity.task.taskKey}
                      </Link>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(activity.createdAt), {
                    addSuffix: true,
                  })}
                </div>
              </div>

              {/* User Avatar */}
              {activity.user && !compact && (
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarImage src={activity.user.image || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {activity.user.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {hasMore && (
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (!showHeader) {
    return content;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Activity
          {activities.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {activities.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
