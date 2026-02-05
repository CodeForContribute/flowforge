"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Slack,
  Loader2,
  ExternalLink,
  Trash2,
  Plus,
  MessageSquare,
  GitPullRequest,
  GitMerge,
  ListTodo,
  ArrowRightLeft,
} from "lucide-react";

interface SlackSettingsProps {
  projectId: string;
}

interface SlackIntegration {
  id: string;
  channelName: string;
  enabled: boolean;
  notifyTaskCreated: boolean;
  notifyStatusChanged: boolean;
  notifyPrCreated: boolean;
  notifyPrMerged: boolean;
  notifyComments: boolean;
  hasWebhook: boolean;
}

export function SlackSettings({ projectId }: SlackSettingsProps) {
  useRouter();
  const [integration, setIntegration] = useState<SlackIntegration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channelName, setChannelName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [notifyTaskCreated, setNotifyTaskCreated] = useState(true);
  const [notifyStatusChanged, setNotifyStatusChanged] = useState(true);
  const [notifyPrCreated, setNotifyPrCreated] = useState(true);
  const [notifyPrMerged, setNotifyPrMerged] = useState(true);
  const [notifyComments, setNotifyComments] = useState(false);

  useEffect(() => {
    fetchIntegration();
  }, [projectId]);

  async function fetchIntegration() {
    try {
      const response = await fetch(`/api/projects/${projectId}/slack`);
      if (response.ok) {
        const data = await response.json();
        if (data.integration) {
          setIntegration(data.integration);
          setChannelName(data.integration.channelName);
          setEnabled(data.integration.enabled);
          setNotifyTaskCreated(data.integration.notifyTaskCreated);
          setNotifyStatusChanged(data.integration.notifyStatusChanged);
          setNotifyPrCreated(data.integration.notifyPrCreated);
          setNotifyPrMerged(data.integration.notifyPrMerged);
          setNotifyComments(data.integration.notifyComments);
        }
      }
    } catch (error) {
      console.error("Error fetching Slack integration:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!webhookUrl && !integration?.hasWebhook) {
      alert("Please enter a Slack webhook URL");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/slack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: webhookUrl || undefined,
          channelName: channelName || "#general",
          enabled,
          notifyTaskCreated,
          notifyStatusChanged,
          notifyPrCreated,
          notifyPrMerged,
          notifyComments,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIntegration(data.integration);
        setWebhookUrl("");
        alert("Slack integration saved successfully! A test message was sent to your channel.");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save Slack integration");
      }
    } catch (error) {
      console.error("Error saving Slack integration:", error);
      alert("An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/slack`, {
        method: "DELETE",
      });

      if (response.ok) {
        setIntegration(null);
        setWebhookUrl("");
        setChannelName("");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete Slack integration");
      }
    } catch (error) {
      console.error("Error deleting Slack integration:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleToggleEnabled(newEnabled: boolean) {
    if (!integration) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/slack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: undefined, // Don't change the webhook
          channelName: integration.channelName,
          enabled: newEnabled,
          notifyTaskCreated: integration.notifyTaskCreated,
          notifyStatusChanged: integration.notifyStatusChanged,
          notifyPrCreated: integration.notifyPrCreated,
          notifyPrMerged: integration.notifyPrMerged,
          notifyComments: integration.notifyComments,
        }),
      });

      if (response.ok) {
        setIntegration({ ...integration, enabled: newEnabled });
        setEnabled(newEnabled);
      }
    } catch (error) {
      console.error("Error updating Slack integration:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Slack className="h-5 w-5" />
          Slack Integration
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Send notifications to a Slack channel when events occur
        </p>
      </div>

      {integration ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#4A154B] flex items-center justify-center">
                  <Slack className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Connected to Slack</CardTitle>
                  <CardDescription>
                    Posting to {integration.channelName}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={integration.enabled ? "default" : "secondary"}>
                  {integration.enabled ? "Active" : "Disabled"}
                </Badge>
                <Switch
                  checked={enabled}
                  onCheckedChange={handleToggleEnabled}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notification Settings */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Notification Events</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Task Created</span>
                  </div>
                  <Switch
                    checked={notifyTaskCreated}
                    onCheckedChange={setNotifyTaskCreated}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Status Changed</span>
                  </div>
                  <Switch
                    checked={notifyStatusChanged}
                    onCheckedChange={setNotifyStatusChanged}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">PR Created</span>
                  </div>
                  <Switch
                    checked={notifyPrCreated}
                    onCheckedChange={setNotifyPrCreated}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <GitMerge className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">PR Merged</span>
                  </div>
                  <Switch
                    checked={notifyPrMerged}
                    onCheckedChange={setNotifyPrMerged}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Comments</span>
                  </div>
                  <Switch
                    checked={notifyComments}
                    onCheckedChange={setNotifyComments}
                  />
                </div>
              </div>
            </div>

            {/* Update Settings */}
            <div className="space-y-3">
              <Label htmlFor="channelName">Channel Name</Label>
              <Input
                id="channelName"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="#general"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="webhookUrl">
                Update Webhook URL (optional)
              </Label>
              <Input
                id="webhookUrl"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to keep the current webhook URL
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Slack</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to disconnect Slack integration?
                      You will stop receiving notifications.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="h-12 w-12 rounded-xl bg-[#4A154B] flex items-center justify-center mx-auto">
                <Slack className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Connect to Slack</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Get notified about task updates, PRs, and more in Slack
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-4 pt-4">
                <div className="space-y-2 text-left">
                  <Label htmlFor="setup-webhookUrl">Slack Webhook URL</Label>
                  <Input
                    id="setup-webhookUrl"
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Create an{" "}
                    <a
                      href="https://api.slack.com/messaging/webhooks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Incoming Webhook
                      <ExternalLink className="h-3 w-3" />
                    </a>{" "}
                    in your Slack workspace
                  </p>
                </div>

                <div className="space-y-2 text-left">
                  <Label htmlFor="setup-channelName">Channel Name</Label>
                  <Input
                    id="setup-channelName"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="#project-updates"
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={isSaving || !webhookUrl}
                  className="w-full"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Connect Slack
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
