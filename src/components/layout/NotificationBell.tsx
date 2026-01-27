"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, GitPullRequest, CheckCircle, MessageSquare, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: "PR_CREATED" | "PR_MERGED" | "REVIEW_REQUESTED" | "TASK_COMPLETED" | "TASK_FAILED";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  task?: {
    id: string;
    title: string;
    projectId: string;
  } | null;
}

const notificationIcons = {
  PR_CREATED: GitPullRequest,
  PR_MERGED: CheckCircle,
  REVIEW_REQUESTED: MessageSquare,
  TASK_COMPLETED: CheckCircle,
  TASK_FAILED: AlertTriangle,
};

const notificationColors = {
  PR_CREATED: "text-blue-500",
  PR_MERGED: "text-green-500",
  REVIEW_REQUESTED: "text-orange-500",
  TASK_COMPLETED: "text-green-500",
  TASK_FAILED: "text-red-500",
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?limit=10");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (notificationIds?: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds }),
      });

      if (notificationIds) {
        setNotifications((prev) =>
          prev.map((n) =>
            notificationIds.includes(n.id) ? { ...n, read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - notificationIds.length));
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      // Mark all as read when opening
      markAsRead();
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {notifications.some((n) => !n.read) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAsRead()}
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type];
              const iconColor = notificationColors[notification.type];

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-3 cursor-pointer focus:bg-muted/50",
                    !notification.read && "bg-primary/5"
                  )}
                  asChild
                >
                  <Link
                    href={
                      notification.task
                        ? `/project/${notification.task.projectId}/task/${notification.task.id}`
                        : "/settings/notifications"
                    }
                  >
                    <div
                      className={cn(
                        "mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        notification.type === "TASK_FAILED"
                          ? "bg-destructive/10"
                          : "bg-muted"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center">
          <Link
            href="/settings/notifications"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Notification settings
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
