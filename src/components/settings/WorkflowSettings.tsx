"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  GitBranch,
  Workflow,
  Settings2,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  WorkflowDefinition,
  TaskStatus,
  BUILT_IN_WORKFLOWS,
  DEFAULT_WORKFLOW,
  ALL_TASK_STATUSES,
  getAllowedTransitions,
} from "@/types";

interface WorkflowSettingsProps {
  projectId: string;
  currentWorkflow: WorkflowDefinition | null;
  isOwner: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  TODO: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  GENERATING: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  AWAITING_CODE_REVIEW: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  PR_OPEN: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  IN_REVIEW: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  CHANGES_REQUESTED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  HAS_CONFLICTS: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  MERGED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  CLOSED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function StatusBadge({ status }: { status: TaskStatus }) {
  const label = ALL_TASK_STATUSES.find((s) => s.id === status)?.title || status;
  return (
    <Badge variant="outline" className={`${STATUS_COLORS[status]} border-0`}>
      {label}
    </Badge>
  );
}

export function WorkflowSettings({
  projectId,
  currentWorkflow,
  isOwner,
}: WorkflowSettingsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowDefinition>(
    currentWorkflow || DEFAULT_WORKFLOW
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null);
  const [customTransitions, setCustomTransitions] = useState<Record<TaskStatus, TaskStatus[]>>(
    () => {
      const initial: Record<string, TaskStatus[]> = {};
      workflow.transitions.forEach((t) => {
        initial[t.from] = t.to;
      });
      return initial as Record<TaskStatus, TaskStatus[]>;
    }
  );

  const handleSelectBuiltIn = (workflowId: string) => {
    const builtIn = BUILT_IN_WORKFLOWS.find((w) => w.id === workflowId);
    if (builtIn) {
      setWorkflow(builtIn);
      // Reset custom transitions when selecting built-in
      const newTransitions: Record<string, TaskStatus[]> = {};
      builtIn.transitions.forEach((t) => {
        newTransitions[t.from] = t.to;
      });
      setCustomTransitions(newTransitions as Record<TaskStatus, TaskStatus[]>);
    }
  };

  const handleToggleTransition = (from: TaskStatus, to: TaskStatus) => {
    setCustomTransitions((prev) => {
      const current = prev[from] || [];
      if (current.includes(to)) {
        return { ...prev, [from]: current.filter((s) => s !== to) };
      } else {
        return { ...prev, [from]: [...current, to] };
      }
    });
  };

  const handleSaveWorkflow = async () => {
    setIsSaving(true);
    try {
      // Build workflow from custom transitions
      const updatedWorkflow: WorkflowDefinition = {
        ...workflow,
        id: workflow.id === "custom" ? "custom" : `custom-${Date.now()}`,
        name: workflow.id.startsWith("custom") ? workflow.name : `Custom (based on ${workflow.name})`,
        isDefault: false,
        transitions: Object.entries(customTransitions).map(([from, to]) => ({
          from: from as TaskStatus,
          to,
        })),
      };

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: updatedWorkflow }),
      });

      if (!response.ok) {
        throw new Error("Failed to save workflow");
      }

      setWorkflow(updatedWorkflow);
      setMessage({ type: "success", text: "Workflow settings saved successfully." });
      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    } catch (error) {
      console.error("Failed to save workflow:", error);
      setMessage({ type: "error", text: "Failed to save workflow settings." });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: null }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset workflow");
      }

      setWorkflow(DEFAULT_WORKFLOW);
      const newTransitions: Record<string, TaskStatus[]> = {};
      DEFAULT_WORKFLOW.transitions.forEach((t) => {
        newTransitions[t.from] = t.to;
      });
      setCustomTransitions(newTransitions as Record<TaskStatus, TaskStatus[]>);

      setMessage({ type: "success", text: "Workflow reset to default." });
      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    } catch (error) {
      console.error("Failed to reset workflow:", error);
      setMessage({ type: "error", text: "Failed to reset workflow." });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Check if current workflow differs from any built-in
  const isCustomized = !BUILT_IN_WORKFLOWS.some(
    (w) => JSON.stringify(w.transitions) === JSON.stringify(workflow.transitions)
  );

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Workflow Configuration
          </CardTitle>
          <CardDescription>
            Define which status transitions are allowed in your project. This helps enforce
            your team&apos;s process.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Workflow Selector */}
          <div className="space-y-2">
            <Label>Select Workflow Template</Label>
            <Select
              value={isCustomized ? "custom" : workflow.id}
              onValueChange={handleSelectBuiltIn}
              disabled={!isOwner}
            >
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select a workflow" />
              </SelectTrigger>
              <SelectContent>
                {BUILT_IN_WORKFLOWS.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    <div className="flex items-center gap-2">
                      {w.id === "default" && <GitBranch className="h-4 w-4" />}
                      {w.id === "simple" && <Check className="h-4 w-4" />}
                      {w.id === "kanban" && <Settings2 className="h-4 w-4" />}
                      {w.name}
                    </div>
                  </SelectItem>
                ))}
                {isCustomized && (
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      Custom Workflow
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {workflow.description}
            </p>
          </div>

          <Separator />

          {/* Transition Diagram */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Status Transitions</Label>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomizeDialog(true)}
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Customize
                </Button>
              )}
            </div>

            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="space-y-4">
                {ALL_TASK_STATUSES.map((status) => {
                  const allowedTo = getAllowedTransitions(workflow, status.id);
                  if (allowedTo.length === 0) return null;

                  return (
                    <div key={status.id} className="flex items-start gap-3">
                      <div className="w-[180px] flex-shrink-0">
                        <StatusBadge status={status.id} />
                      </div>
                      <ArrowRight className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                      <div className="flex flex-wrap gap-2">
                        {allowedTo.map((to) => (
                          <StatusBadge key={to} status={to} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          {isOwner && (
            <div className="flex items-center gap-3">
              <Button onClick={handleSaveWorkflow} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Workflow"}
              </Button>
              {currentWorkflow && (
                <Button
                  variant="outline"
                  onClick={handleResetToDefault}
                  disabled={isSaving}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Default
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customize Dialog */}
      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customize Transitions</DialogTitle>
            <DialogDescription>
              Select which status transitions should be allowed from each status.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            {/* Status List */}
            <div className="space-y-2">
              <Label>From Status</Label>
              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {ALL_TASK_STATUSES.map((status) => (
                    <button
                      key={status.id}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        selectedStatus === status.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedStatus(status.id)}
                    >
                      {status.title}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Allowed Transitions */}
            <div className="space-y-2">
              <Label>Can transition to</Label>
              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-2 space-y-2">
                  {selectedStatus ? (
                    ALL_TASK_STATUSES.filter((s) => s.id !== selectedStatus).map(
                      (status) => (
                        <div
                          key={status.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`transition-${status.id}`}
                            checked={(customTransitions[selectedStatus] || []).includes(
                              status.id
                            )}
                            onCheckedChange={() =>
                              handleToggleTransition(selectedStatus, status.id)
                            }
                          />
                          <label
                            htmlFor={`transition-${status.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {status.title}
                          </label>
                        </div>
                      )
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground p-2">
                      Select a status to configure its transitions
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomizeDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Update workflow with custom transitions
                setWorkflow((prev) => ({
                  ...prev,
                  id: prev.id.startsWith("custom") ? prev.id : "custom",
                  name: prev.id.startsWith("custom") ? prev.name : "Custom Workflow",
                  isDefault: false,
                  transitions: Object.entries(customTransitions).map(([from, to]) => ({
                    from: from as TaskStatus,
                    to,
                  })),
                }));
                setShowCustomizeDialog(false);
              }}
            >
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
