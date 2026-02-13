"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutGrid,
  Trash2,
  Loader2,
  GripVertical,
  RotateCcw,
  Save,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { BoardColumn, DEFAULT_BOARD_COLUMNS, ALL_TASK_STATUSES, TaskStatus } from "@/types";
import { cn } from "@/lib/utils";

interface BoardSettingsProps {
  projectId: string;
  boardColumns: BoardColumn[] | null;
  wipLimits: Record<string, number> | null;
  isOwner: boolean;
}

export function BoardSettings({ projectId, boardColumns, wipLimits, isOwner }: BoardSettingsProps) {
  const router = useRouter();
  const [columns, setColumns] = useState<BoardColumn[]>(
    boardColumns || DEFAULT_BOARD_COLUMNS
  );
  const [limits, setLimits] = useState<Record<string, number>>(wipLimits || {});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Get available statuses that aren't already in columns
  const availableStatuses = ALL_TASK_STATUSES.filter(
    (status) => !columns.some((col) => col.id === status.id)
  );

  function addColumn(statusId: TaskStatus) {
    const status = ALL_TASK_STATUSES.find((s) => s.id === statusId);
    if (!status) return;

    const newColumn: BoardColumn = {
      id: statusId,
      title: status.title,
      order: columns.length,
    };
    setColumns([...columns, newColumn]);
    setHasChanges(true);
  }

  function removeColumn(columnId: TaskStatus) {
    if (columns.length <= 1) {
      alert("You must have at least one column");
      return;
    }
    const newColumns = columns
      .filter((col) => col.id !== columnId)
      .map((col, index) => ({ ...col, order: index }));
    setColumns(newColumns);
    setHasChanges(true);
  }

  function moveColumn(index: number, direction: "up" | "down") {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === columns.length - 1)
    ) {
      return;
    }

    const newColumns = [...columns];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newColumns[index], newColumns[swapIndex]] = [newColumns[swapIndex], newColumns[index]];

    // Update order values
    newColumns.forEach((col, i) => {
      col.order = i;
    });

    setColumns(newColumns);
    setHasChanges(true);
  }

  function updateColumnTitle(index: number, title: string) {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], title };
    setColumns(newColumns);
    setHasChanges(true);
  }

  function updateWipLimit(columnId: TaskStatus, limit: number) {
    setLimits((prev) => {
      const newLimits = { ...prev };
      if (limit > 0) {
        newLimits[columnId] = limit;
      } else {
        delete newLimits[columnId];
      }
      return newLimits;
    });
    setHasChanges(true);
  }

  function resetToDefaults() {
    setColumns(DEFAULT_BOARD_COLUMNS);
    setLimits({});
    setHasChanges(true);
  }

  async function saveChanges() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardColumns: columns,
          wipLimits: limits,
        }),
      });

      if (response.ok) {
        setHasChanges(false);
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save board settings");
      }
    } catch (error) {
      console.error("Error saving board settings:", error);
      alert("An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Board Columns
          </CardTitle>
          <CardDescription>
            Configure which status columns appear on your Kanban board and in what order.
            You can also set WIP (Work In Progress) limits for each column.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Columns */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Active Columns</div>
            <div className="space-y-2">
              {columns.map((column, index) => (
                <div
                  key={column.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveColumn(index, "up")}
                      disabled={index === 0 || !isOwner}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveColumn(index, "down")}
                      disabled={index === columns.length - 1 || !isOwner}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <Badge variant="outline" className="font-mono text-xs">
                    {column.id}
                  </Badge>

                  <Input
                    value={column.title}
                    onChange={(e) => updateColumnTitle(index, e.target.value)}
                    className="flex-1 h-8"
                    disabled={!isOwner}
                  />

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      WIP Limit:
                    </span>
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      value={limits[column.id] || ""}
                      onChange={(e) => updateWipLimit(column.id, parseInt(e.target.value) || 0)}
                      className="w-16 h-8"
                      placeholder="None"
                      disabled={!isOwner}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeColumn(column.id)}
                    disabled={columns.length <= 1 || !isOwner}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Column */}
          {availableStatuses.length > 0 && isOwner && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Add Column</div>
              <div className="flex items-center gap-2">
                <Select onValueChange={(value) => addColumn(value as TaskStatus)}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a status to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {availableStatuses.length} statuses available
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          {isOwner && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={resetToDefaults}
                disabled={isSaving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>

              <Button
                onClick={saveChanges}
                disabled={!hasChanges || isSaving}
                className={cn(!hasChanges && "opacity-50")}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}

          {!isOwner && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              Only the project owner can modify board settings.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
          <CardDescription>
            This is how your board columns will appear.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex-shrink-0 w-48 p-3 bg-muted/30 rounded-lg border"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{column.title}</span>
                  {limits[column.id] && (
                    <Badge variant="secondary" className="text-xs">
                      {limits[column.id]}
                    </Badge>
                  )}
                </div>
                <div className="h-20 border-2 border-dashed border-muted-foreground/20 rounded flex items-center justify-center text-xs text-muted-foreground">
                  Tasks go here
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
