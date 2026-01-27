"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail, MessageSquare, GitPullRequest, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface NotificationSetting {
  id: string;
  key: keyof NotificationPreferences;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NotificationPreferences {
  notifyPrCreated: boolean;
  notifyPrMerged: boolean;
  notifyReviewRequested: boolean;
  notifyTaskCompleted: boolean;
  notifyTaskFailed: boolean;
}

const notificationSettings: NotificationSetting[] = [
  {
    id: "pr_created",
    key: "notifyPrCreated",
    label: "Pull Request Created",
    description: "When a new PR is created for your task",
    icon: GitPullRequest,
  },
  {
    id: "pr_merged",
    key: "notifyPrMerged",
    label: "Pull Request Merged",
    description: "When your PR gets merged",
    icon: CheckCircle,
  },
  {
    id: "review_requested",
    key: "notifyReviewRequested",
    label: "Review Requested",
    description: "When changes are requested on your PR",
    icon: MessageSquare,
  },
  {
    id: "task_completed",
    key: "notifyTaskCompleted",
    label: "Task Completed",
    description: "When a task execution completes",
    icon: CheckCircle,
  },
  {
    id: "task_failed",
    key: "notifyTaskFailed",
    label: "Task Failed",
    description: "When a task execution fails",
    icon: AlertTriangle,
  },
];

export function NotificationsSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notifyPrCreated: true,
    notifyPrMerged: true,
    notifyReviewRequested: true,
    notifyTaskCompleted: true,
    notifyTaskFailed: true,
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPreferences() {
      try {
        const response = await fetch("/api/user/preferences");
        if (response.ok) {
          const data = await response.json();
          setPreferences({
            notifyPrCreated: data.preferences.notifyPrCreated,
            notifyPrMerged: data.preferences.notifyPrMerged,
            notifyReviewRequested: data.preferences.notifyReviewRequested,
            notifyTaskCompleted: data.preferences.notifyTaskCompleted,
            notifyTaskFailed: data.preferences.notifyTaskFailed,
          });
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPreferences();
  }, []);

  const toggleSetting = async (key: keyof NotificationPreferences) => {
    const newValue = !preferences[key];
    setUpdating(key);

    // Optimistic update
    setPreferences((prev) => ({ ...prev, [key]: newValue }));

    try {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });

      if (!response.ok) {
        // Revert on error
        setPreferences((prev) => ({ ...prev, [key]: !newValue }));
      }
    } catch (error) {
      console.error("Error updating preference:", error);
      // Revert on error
      setPreferences((prev) => ({ ...prev, [key]: !newValue }));
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Mail className="h-4 w-4" />
              Email Notifications
            </div>
            <div className="space-y-4">
              {notificationSettings.map((setting) => (
                <div
                  key={setting.id}
                  className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <setting.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <Label htmlFor={setting.id} className="font-medium cursor-pointer">
                        {setting.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {setting.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {updating === setting.key && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    <Switch
                      id={setting.id}
                      checked={preferences[setting.key]}
                      onCheckedChange={() => toggleSetting(setting.key)}
                      disabled={updating !== null}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-muted-foreground">Coming Soon</CardTitle>
          <CardDescription>
            Additional notification channels will be available soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: "Slack", description: "Get notifications in Slack" },
              { name: "Discord", description: "Get notifications in Discord" },
              { name: "Webhook", description: "Send to custom webhook" },
              { name: "Mobile Push", description: "Push notifications" },
            ].map((item) => (
              <div
                key={item.name}
                className="p-4 rounded-xl border border-dashed bg-muted/30 opacity-60"
              >
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
