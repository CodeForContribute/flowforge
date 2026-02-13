"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  X,
  CheckSquare,
  User,
  Tag,
  Milestone,
  Trash2,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { ALL_TASK_STATUSES, TaskStatus, TaskPriority } from "@/types";

interface BulkActionsToolbarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  members: { id: string; name: string | null; image: string | null }[];
  labels: { id: string; name: string; color: string }[];
  sprints: { id: string; name: string }[];
}

const PRIORITIES: { id: TaskPriority; label: string }[] = [
  { id: "LOW", label: "Low" },
  { id: "MEDIUM", label: "Medium" },
  { id: "HIGH", label: "High" },
  { id: "URGENT", label: "Urgent" },
];

export function BulkActionsToolbar({
  selectedIds,
  onClearSelection,
  members,
  labels,
  sprints,
}: BulkActionsToolbarProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performBulkAction = async (
    action: string,
    value?: string | string[] | null
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskIds: selectedIds,
          action,
          value,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Operation failed");
        return;
      }

      onClearSelection();
      router.refresh();
    } catch (err) {
      console.error("Bulk action error:", err);
      setError("Failed to perform operation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetStatus = (status: TaskStatus) => {
    performBulkAction("set_status", status);
  };

  const handleSetPriority = (priority: TaskPriority) => {
    performBulkAction("set_priority", priority);
  };

  const handleAssign = (userId: string | null) => {
    if (userId) {
      performBulkAction("assign", userId);
    } else {
      performBulkAction("unassign");
    }
  };

  const handleAddLabels = (labelId: string) => {
    performBulkAction("add_labels", [labelId]);
  };

  const handleRemoveLabels = (labelId: string) => {
    performBulkAction("remove_labels", [labelId]);
  };

  const handleSetSprint = (sprintId: string | null) => {
    if (sprintId) {
      performBulkAction("set_sprint", sprintId);
    } else {
      performBulkAction("remove_from_sprint");
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    performBulkAction("delete");
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="sticky top-0 z-20 flex items-center gap-3 p-3 bg-primary text-primary-foreground rounded-lg shadow-lg animate-in slide-in-from-top-2">
        {/* Selection count */}
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          <span className="font-medium">
            {selectedIds.length} selected
          </span>
        </div>

        <div className="h-4 w-px bg-primary-foreground/30" />

        {/* Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isLoading}>
            <Button variant="secondary" size="sm" className="gap-1">
              Status
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {ALL_TASK_STATUSES.slice(0, 6).map((status) => (
              <DropdownMenuItem
                key={status.id}
                onClick={() => handleSetStatus(status.id)}
              >
                {status.title}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {ALL_TASK_STATUSES.slice(6).map((status) => (
              <DropdownMenuItem
                key={status.id}
                onClick={() => handleSetStatus(status.id)}
              >
                {status.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isLoading}>
            <Button variant="secondary" size="sm" className="gap-1">
              Priority
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {PRIORITIES.map((priority) => (
              <DropdownMenuItem
                key={priority.id}
                onClick={() => handleSetPriority(priority.id)}
              >
                {priority.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assignee */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isLoading}>
            <Button variant="secondary" size="sm" className="gap-1">
              <User className="h-3 w-3" />
              Assign
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleAssign(null)}>
              Unassign
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {members.map((member) => (
              <DropdownMenuItem
                key={member.id}
                onClick={() => handleAssign(member.id)}
              >
                {member.name || "Unknown"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Labels */}
        {labels.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isLoading}>
              <Button variant="secondary" size="sm" className="gap-1">
                <Tag className="h-3 w-3" />
                Labels
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                Add Label
              </div>
              {labels.map((label) => (
                <DropdownMenuItem
                  key={`add-${label.id}`}
                  onClick={() => handleAddLabels(label.id)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                Remove Label
              </div>
              {labels.map((label) => (
                <DropdownMenuItem
                  key={`remove-${label.id}`}
                  onClick={() => handleRemoveLabels(label.id)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Sprint */}
        {sprints.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isLoading}>
              <Button variant="secondary" size="sm" className="gap-1">
                <Milestone className="h-3 w-3" />
                Sprint
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleSetSprint(null)}>
                Remove from sprint
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {sprints.map((sprint) => (
                <DropdownMenuItem
                  key={sprint.id}
                  onClick={() => handleSetSprint(sprint.id)}
                >
                  {sprint.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="flex-1" />

        {/* Error display */}
        {error && (
          <Badge variant="destructive" className="bg-destructive/20">
            {error}
          </Badge>
        )}

        {/* Loading indicator */}
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}

        {/* Delete */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isLoading}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All selected tasks will be permanently
              deleted, including their comments and attachments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
