"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Webhook,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface WebhookSettingsProps {
  projectId: string;
}

type WebhookTrigger =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "STATUS_CHANGED"
  | "PR_CREATED"
  | "PR_MERGED"
  | "COMMENT_ADDED"
  | "SPRINT_STARTED"
  | "SPRINT_COMPLETED";

interface WebhookData {
  id: string;
  name: string;
  url: string;
  hasSecret: boolean;
  triggers: WebhookTrigger[];
  enabled: boolean;
  createdAt: string;
  _count: { deliveries: number };
  deliveries: {
    id: string;
    success: boolean;
    deliveredAt: string;
    responseCode: number | null;
  }[];
}

const triggerLabels: Record<WebhookTrigger, string> = {
  TASK_CREATED: "Task Created",
  TASK_UPDATED: "Task Updated",
  TASK_DELETED: "Task Deleted",
  STATUS_CHANGED: "Status Changed",
  PR_CREATED: "PR Created",
  PR_MERGED: "PR Merged",
  COMMENT_ADDED: "Comment Added",
  SPRINT_STARTED: "Sprint Started",
  SPRINT_COMPLETED: "Sprint Completed",
};

const allTriggers: WebhookTrigger[] = [
  "TASK_CREATED",
  "TASK_UPDATED",
  "TASK_DELETED",
  "STATUS_CHANGED",
  "PR_CREATED",
  "PR_MERGED",
  "COMMENT_ADDED",
  "SPRINT_STARTED",
  "SPRINT_COMPLETED",
];

export function WebhookSettings({ projectId }: WebhookSettingsProps) {
  useRouter();
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formTriggers, setFormTriggers] = useState<WebhookTrigger[]>([]);

  useEffect(() => {
    fetchWebhooks();
  }, [projectId]);

  async function fetchWebhooks() {
    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks`);
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks);
      }
    } catch (error) {
      console.error("Error fetching webhooks:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormName("");
    setFormUrl("");
    setFormSecret("");
    setFormTriggers([]);
    setShowSecret(false);
  }

  async function handleCreate() {
    if (!formName || !formUrl || formTriggers.length === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          url: formUrl,
          secret: formSecret || undefined,
          triggers: formTriggers,
        }),
      });

      if (response.ok) {
        setShowCreateDialog(false);
        resetForm();
        fetchWebhooks();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create webhook");
      }
    } catch (error) {
      console.error("Error creating webhook:", error);
      alert("An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleEnabled(webhookId: string, enabled: boolean) {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/webhooks/${webhookId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        }
      );

      if (response.ok) {
        setWebhooks((prev) =>
          prev.map((w) => (w.id === webhookId ? { ...w, enabled } : w))
        );
      }
    } catch (error) {
      console.error("Error updating webhook:", error);
    }
  }

  async function handleDelete(webhookId: string) {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/webhooks/${webhookId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete webhook");
      }
    } catch (error) {
      console.error("Error deleting webhook:", error);
    }
  }

  function toggleTrigger(trigger: WebhookTrigger) {
    setFormTriggers((prev) =>
      prev.includes(trigger)
        ? prev.filter((t) => t !== trigger)
        : [...prev, trigger]
    );
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Send event notifications to external services
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription>
                Configure a new webhook to receive event notifications
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="My Webhook"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">Payload URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/webhook"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secret">Secret (optional)</Label>
                <div className="relative">
                  <Input
                    id="secret"
                    type={showSecret ? "text" : "password"}
                    placeholder="Used to sign webhook payloads"
                    value={formSecret}
                    onChange={(e) => setFormSecret(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Payloads will be signed with HMAC-SHA256
                </p>
              </div>
              <div className="space-y-2">
                <Label>Events</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg max-h-48 overflow-y-auto">
                  {allTriggers.map((trigger) => (
                    <div key={trigger} className="flex items-center gap-2">
                      <Checkbox
                        id={trigger}
                        checked={formTriggers.includes(trigger)}
                        onCheckedChange={() => toggleTrigger(trigger)}
                      />
                      <label
                        htmlFor={trigger}
                        className="text-sm cursor-pointer"
                      >
                        {triggerLabels[trigger]}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  isSaving ||
                  !formName ||
                  !formUrl ||
                  formTriggers.length === 0
                }
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Webhook
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {webhooks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Webhook className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-semibold mb-2">No webhooks configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a webhook to send event notifications to external services
            </p>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => {
            const lastDelivery = webhook.deliveries[0];

            return (
              <Card key={webhook.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{webhook.name}</h3>
                        {webhook.hasSecret && (
                          <Badge variant="outline" className="text-[10px]">
                            Signed
                          </Badge>
                        )}
                        <Badge
                          variant={webhook.enabled ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {webhook.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono truncate mb-2">
                        {webhook.url}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {webhook.triggers.map((trigger) => (
                          <Badge
                            key={trigger}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {triggerLabels[trigger]}
                          </Badge>
                        ))}
                      </div>
                      {lastDelivery && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {lastDelivery.success ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span>
                            Last delivery{" "}
                            {formatDistanceToNow(
                              new Date(lastDelivery.deliveredAt),
                              { addSuffix: true }
                            )}
                          </span>
                          {lastDelivery.responseCode && (
                            <span
                              className={cn(
                                "font-mono",
                                lastDelivery.success
                                  ? "text-green-600"
                                  : "text-red-600"
                              )}
                            >
                              {lastDelivery.responseCode}
                            </span>
                          )}
                          <span>•</span>
                          <span>{webhook._count.deliveries} total</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={webhook.enabled}
                        onCheckedChange={(enabled) =>
                          handleToggleEnabled(webhook.id, enabled)
                        }
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{webhook.name}&quot;?
                              This will also delete all delivery history.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(webhook.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
