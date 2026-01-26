"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tag, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface LabelData {
  id: string;
  name: string;
  color: string;
  taskCount: number;
}

interface LabelsSettingsProps {
  projectId: string;
  labels: LabelData[];
  isOwner: boolean;
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#64748b", // slate
];

export function LabelsSettings({ projectId, labels, isOwner }: LabelsSettingsProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<LabelData | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newLabel, setNewLabel] = useState({ name: "", color: "#6366f1" });

  async function createLabel() {
    if (!newLabel.name.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLabel),
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setNewLabel({ name: "", color: "#6366f1" });
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create label");
      }
    } catch (error) {
      console.error("Error creating label:", error);
      alert("An error occurred");
    } finally {
      setIsCreating(false);
    }
  }

  async function updateLabel() {
    if (!editingLabel) return;

    setIsCreating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/labels/${editingLabel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingLabel.name, color: editingLabel.color }),
      });

      if (response.ok) {
        setEditingLabel(null);
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update label");
      }
    } catch (error) {
      console.error("Error updating label:", error);
      alert("An error occurred");
    } finally {
      setIsCreating(false);
    }
  }

  async function deleteLabel(labelId: string) {
    setIsDeleting(labelId);
    try {
      const response = await fetch(`/api/projects/${projectId}/labels/${labelId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete label");
      }
    } catch (error) {
      console.error("Error deleting label:", error);
      alert("An error occurred");
    } finally {
      setIsDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Labels
              </CardTitle>
              <CardDescription>
                Manage labels to organize and categorize your tasks
              </CardDescription>
            </div>
            {isOwner && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Label
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Label</DialogTitle>
                    <DialogDescription>
                      Add a new label to organize your tasks
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="labelName">Name</Label>
                      <Input
                        id="labelName"
                        value={newLabel.name}
                        onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
                        placeholder="e.g., bug, feature, documentation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewLabel({ ...newLabel, color })}
                            className={`h-8 w-8 rounded-lg border-2 transition-all ${
                              newLabel.color === color
                                ? "border-foreground scale-110"
                                : "border-transparent hover:scale-105"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Preview</Label>
                      <Badge
                        style={{
                          backgroundColor: `${newLabel.color}20`,
                          color: newLabel.color,
                          borderColor: `${newLabel.color}40`,
                        }}
                        className="border"
                      >
                        {newLabel.name || "label name"}
                      </Badge>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createLabel} disabled={isCreating || !newLabel.name.trim()}>
                      {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Label
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {labels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No labels yet</p>
              <p className="text-sm">Create labels to organize your tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {labels.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="font-medium">{label.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {label.taskCount} {label.taskCount === 1 ? "task" : "tasks"}
                    </span>
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-1">
                      <Dialog
                        open={editingLabel?.id === label.id}
                        onOpenChange={(open) => !open && setEditingLabel(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingLabel(label)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Label</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="editLabelName">Name</Label>
                              <Input
                                id="editLabelName"
                                value={editingLabel?.name || ""}
                                onChange={(e) =>
                                  setEditingLabel(
                                    editingLabel
                                      ? { ...editingLabel, name: e.target.value }
                                      : null
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Color</Label>
                              <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map((color) => (
                                  <button
                                    key={color}
                                    type="button"
                                    onClick={() =>
                                      setEditingLabel(
                                        editingLabel ? { ...editingLabel, color } : null
                                      )
                                    }
                                    className={`h-8 w-8 rounded-lg border-2 transition-all ${
                                      editingLabel?.color === color
                                        ? "border-foreground scale-110"
                                        : "border-transparent hover:scale-105"
                                    }`}
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingLabel(null)}>
                              Cancel
                            </Button>
                            <Button onClick={updateLabel} disabled={isCreating}>
                              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Save Changes
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteLabel(label.id)}
                        disabled={isDeleting === label.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {isDeleting === label.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
