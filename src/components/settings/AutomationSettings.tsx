"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Zap,
  Plus,
  Trash2,
  Settings2,
  Play,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import {
  AutomationRule,
  AutomationTrigger,
  AutomationAction,
  AutomationCondition,
  AutomationActionConfig,
  ALL_TASK_STATUSES,
  TaskPriority,
} from "@/types";

interface AutomationSettingsProps {
  projectId: string;
  currentRules: AutomationRule[];
  members: { id: string; name: string | null }[];
  labels: { id: string; name: string; color: string }[];
  sprints: { id: string; name: string }[];
  isOwner: boolean;
}

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  on_create: "When task is created",
  on_status_change: "When status changes",
  on_assign: "When task is assigned",
  on_label_add: "When label is added",
  on_label_remove: "When label is removed",
  on_comment: "When comment is added",
  on_due_date_passed: "When due date passes",
};

const ACTION_LABELS: Record<AutomationAction, string> = {
  set_status: "Set status to",
  assign_user: "Assign to",
  add_label: "Add label",
  remove_label: "Remove label",
  send_notification: "Send notification",
  add_to_sprint: "Add to sprint",
};

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function generateId() {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function AutomationSettings({
  projectId,
  currentRules,
  members,
  labels,
  sprints,
  isOwner,
}: AutomationSettingsProps) {
  const router = useRouter();
  const [rules, setRules] = useState<AutomationRule[]>(currentRules);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  // Form state for new/edit rule
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleTrigger, setRuleTrigger] = useState<AutomationTrigger>("on_create");
  const [ruleTriggerValue, setRuleTriggerValue] = useState("");
  const [ruleConditions, setRuleConditions] = useState<AutomationCondition[]>([]);
  const [ruleActions, setRuleActions] = useState<AutomationActionConfig[]>([]);

  const resetForm = () => {
    setRuleName("");
    setRuleDescription("");
    setRuleTrigger("on_create");
    setRuleTriggerValue("");
    setRuleConditions([]);
    setRuleActions([]);
    setEditingRule(null);
  };

  const openEditDialog = (rule: AutomationRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleDescription(rule.description || "");
    setRuleTrigger(rule.trigger);
    setRuleTriggerValue(rule.triggerValue || "");
    setRuleConditions(rule.conditions);
    setRuleActions(rule.actions);
    setShowAddDialog(true);
  };

  const handleSaveRule = () => {
    if (!ruleName || ruleActions.length === 0) return;

    const newRule: AutomationRule = {
      id: editingRule?.id || generateId(),
      name: ruleName,
      description: ruleDescription || undefined,
      enabled: editingRule?.enabled ?? true,
      trigger: ruleTrigger,
      triggerValue: ruleTriggerValue || undefined,
      conditions: ruleConditions,
      actions: ruleActions,
      createdAt: editingRule?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (editingRule) {
      setRules((prev) => prev.map((r) => (r.id === editingRule.id ? newRule : r)));
    } else {
      setRules((prev) => [...prev, newRule]);
    }

    setShowAddDialog(false);
    resetForm();
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const handleToggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automationRules: rules }),
      });

      if (!response.ok) {
        throw new Error("Failed to save automation rules");
      }

      setMessage({ type: "success", text: "Automation rules saved successfully." });
      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    } catch (error) {
      console.error("Failed to save automation rules:", error);
      setMessage({ type: "error", text: "Failed to save automation rules." });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const addCondition = () => {
    setRuleConditions((prev) => [
      ...prev,
      { field: "status", operator: "equals", value: "" },
    ]);
  };

  const updateCondition = (index: number, updates: Partial<AutomationCondition>) => {
    setRuleConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  const removeCondition = (index: number) => {
    setRuleConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const addAction = () => {
    setRuleActions((prev) => [...prev, { action: "set_status", value: "TODO" }]);
  };

  const updateAction = (index: number, updates: Partial<AutomationActionConfig>) => {
    setRuleActions((prev) =>
      prev.map((a, i) => (i === index ? { ...a, ...updates } : a))
    );
  };

  const removeAction = (index: number) => {
    setRuleActions((prev) => prev.filter((_, i) => i !== index));
  };

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Automation Rules
              </CardTitle>
              <CardDescription>
                Automate repetitive tasks with rules that trigger on specific events.
              </CardDescription>
            </div>
            {isOwner && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No automation rules configured</p>
              <p className="text-sm">Create rules to automate task workflows</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 border rounded-lg ${
                    rule.enabled ? "bg-background" : "bg-muted/50 opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rule.name}</span>
                        {!rule.enabled && (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground">
                          {rule.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="gap-1">
                          <Play className="h-3 w-3" />
                          {TRIGGER_LABELS[rule.trigger]}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex gap-1">
                          {rule.actions.map((action, i) => (
                            <Badge key={i} variant="secondary">
                              {ACTION_LABELS[action.action]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    {isOwner && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => handleToggleRule(rule.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(rule)}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isOwner && rules.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <Button onClick={handleSaveAll} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Rule Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Automation Rule" : "Create Automation Rule"}
            </DialogTitle>
            <DialogDescription>
              Define when and how this automation should run.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              {/* Rule Name & Description */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Rule Name *</Label>
                  <Input
                    id="rule-name"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g., Auto-assign bugs to John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-desc">Description</Label>
                  <Input
                    id="rule-desc"
                    value={ruleDescription}
                    onChange={(e) => setRuleDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
              </div>

              <Separator />

              {/* Trigger */}
              <div className="space-y-4">
                <Label>When this happens...</Label>
                <Select
                  value={ruleTrigger}
                  onValueChange={(v) => setRuleTrigger(v as AutomationTrigger)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {ruleTrigger === "on_status_change" && (
                  <div className="space-y-2">
                    <Label>To status (optional)</Label>
                    <Select
                      value={ruleTriggerValue || "any"}
                      onValueChange={(v) => setRuleTriggerValue(v === "any" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any status</SelectItem>
                        {ALL_TASK_STATUSES.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Separator />

              {/* Conditions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>If these conditions are met (optional)</Label>
                  <Button variant="outline" size="sm" onClick={addCondition}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Condition
                  </Button>
                </div>

                {ruleConditions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No conditions - rule will always run when triggered
                  </p>
                ) : (
                  <div className="space-y-2">
                    {ruleConditions.map((condition, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Select
                          value={condition.field}
                          onValueChange={(v) =>
                            updateCondition(index, { field: v as AutomationCondition["field"] })
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="status">Status</SelectItem>
                            <SelectItem value="priority">Priority</SelectItem>
                            <SelectItem value="taskType">Task Type</SelectItem>
                            <SelectItem value="assigneeId">Assignee</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={condition.operator}
                          onValueChange={(v) =>
                            updateCondition(index, { operator: v as AutomationCondition["operator"] })
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">equals</SelectItem>
                            <SelectItem value="not_equals">not equals</SelectItem>
                            <SelectItem value="is_empty">is empty</SelectItem>
                            <SelectItem value="is_not_empty">is not empty</SelectItem>
                          </SelectContent>
                        </Select>

                        {condition.operator !== "is_empty" && condition.operator !== "is_not_empty" && (
                          <>
                            {condition.field === "status" && (
                              <Select
                                value={condition.value as string}
                                onValueChange={(v) => updateCondition(index, { value: v })}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ALL_TASK_STATUSES.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {condition.field === "priority" && (
                              <Select
                                value={condition.value as string}
                                onValueChange={(v) => updateCondition(index, { value: v })}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PRIORITIES.map((p) => (
                                    <SelectItem key={p} value={p}>
                                      {p}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {condition.field === "assigneeId" && (
                              <Select
                                value={condition.value as string}
                                onValueChange={(v) => updateCondition(index, { value: v })}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select member" />
                                </SelectTrigger>
                                <SelectContent>
                                  {members.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                      {m.name || "Unknown"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCondition(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Then do this... *</Label>
                  <Button variant="outline" size="sm" onClick={addAction}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Action
                  </Button>
                </div>

                {ruleActions.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    At least one action is required
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ruleActions.map((action, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Select
                          value={action.action}
                          onValueChange={(v) =>
                            updateAction(index, { action: v as AutomationAction, value: null })
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ACTION_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {action.action === "set_status" && (
                          <Select
                            value={action.value as string}
                            onValueChange={(v) => updateAction(index, { value: v })}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_TASK_STATUSES.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {action.action === "assign_user" && (
                          <Select
                            value={action.value as string}
                            onValueChange={(v) => updateAction(index, { value: v })}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select member" />
                            </SelectTrigger>
                            <SelectContent>
                              {members.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name || "Unknown"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {(action.action === "add_label" || action.action === "remove_label") && (
                          <Select
                            value={action.value as string}
                            onValueChange={(v) => updateAction(index, { value: v })}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select label" />
                            </SelectTrigger>
                            <SelectContent>
                              {labels.map((l) => (
                                <SelectItem key={l.id} value={l.id}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: l.color }}
                                    />
                                    {l.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {action.action === "add_to_sprint" && (
                          <Select
                            value={action.value as string}
                            onValueChange={(v) => updateAction(index, { value: v })}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select sprint" />
                            </SelectTrigger>
                            <SelectContent>
                              {sprints.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAction(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRule}
              disabled={!ruleName || ruleActions.length === 0}
            >
              {editingRule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
