"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail, MessageSquare, GitPullRequest, AlertTriangle, CheckCircle } from "lucide-react";

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

export function NotificationsSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: "pr_created",
      label: "Pull Request Created",
      description: "When a new PR is created for your task",
      icon: GitPullRequest,
      enabled: true,
    },
    {
      id: "pr_merged",
      label: "Pull Request Merged",
      description: "When your PR gets merged",
      icon: CheckCircle,
      enabled: true,
    },
    {
      id: "review_requested",
      label: "Review Requested",
      description: "When changes are requested on your PR",
      icon: MessageSquare,
      enabled: true,
    },
    {
      id: "task_completed",
      label: "Task Completed",
      description: "When a task execution completes",
      icon: CheckCircle,
      enabled: true,
    },
    {
      id: "task_failed",
      label: "Task Failed",
      description: "When a task execution fails",
      icon: AlertTriangle,
      enabled: true,
    },
  ]);

  const toggleSetting = (id: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

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
              {settings.map((setting) => (
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
                  <Switch
                    id={setting.id}
                    checked={setting.enabled}
                    onCheckedChange={() => toggleSetting(setting.id)}
                  />
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
