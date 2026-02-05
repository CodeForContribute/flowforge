"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TaskTypeBadge } from "./TaskTypeBadge";
import { Link2, Loader2, Search, AlertCircle } from "lucide-react";
import { TaskStatus, TaskType, LinkType } from "@/types";

interface SearchResult {
  id: string;
  title: string;
  taskKey: string;
  status: TaskStatus;
  taskType: TaskType;
}

interface LinkTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  projectId: string;
  onLinkCreated: () => void;
}

const linkTypeOptions: { value: LinkType; label: string; description: string }[] = [
  {
    value: "BLOCKS",
    label: "blocks",
    description: "This task blocks the selected task",
  },
  {
    value: "RELATES_TO",
    label: "relates to",
    description: "Tasks are related to each other",
  },
  {
    value: "DUPLICATES",
    label: "duplicates",
    description: "This task is a duplicate of the selected task",
  },
];

export function LinkTaskDialog({
  open,
  onOpenChange,
  taskId,
  projectId,
  onLinkCreated,
}: LinkTaskDialogProps) {
  const [search, setSearch] = useState("");
  const [linkType, setLinkType] = useState<LinkType>("RELATES_TO");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedTask, setSelectedTask] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setSearch("");
      setSelectedTask(null);
      setSearchResults([]);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim().length >= 2) {
        searchTasks();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function searchTasks() {
    setSearching(true);
    try {
      const response = await fetch(
        `/api/tasks?projectId=${projectId}&search=${encodeURIComponent(search)}`
      );
      if (response.ok) {
        const data = await response.json();
        // Filter out the current task
        const filtered = data.tasks.filter(
          (t: SearchResult) => t.id !== taskId
        );
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error("Error searching tasks:", err);
    } finally {
      setSearching(false);
    }
  }

  async function handleCreate() {
    if (!selectedTask) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetTaskId: selectedTask.id,
          linkType,
        }),
      });

      if (response.ok) {
        onLinkCreated();
        onOpenChange(false);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create link");
      }
    } catch (err) {
      setError("Failed to create link");
      console.error("Error creating link:", err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Issue
          </DialogTitle>
          <DialogDescription>
            Create a relationship between this task and another task.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Link Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Link Type</label>
            <Select
              value={linkType}
              onValueChange={(v) => setLinkType(v as LinkType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {linkTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search for task</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or task key..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && !selectedTask && (
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  className="w-full flex items-center gap-2 p-2 hover:bg-accent text-left"
                  onClick={() => setSelectedTask(result)}
                >
                  <TaskTypeBadge
                    type={result.taskType}
                    size="sm"
                    showLabel={false}
                  />
                  <span className="text-xs font-mono text-primary/80 bg-primary/10 px-1 py-0.5 rounded shrink-0">
                    {result.taskKey}
                  </span>
                  <span className="flex-1 text-sm truncate">{result.title}</span>
                  <StatusBadge status={result.status} size="sm" />
                </button>
              ))}
            </div>
          )}

          {/* Selected Task */}
          {selectedTask && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TaskTypeBadge
                    type={selectedTask.taskType}
                    size="sm"
                    showLabel={false}
                  />
                  <span className="text-xs font-mono text-primary/80 bg-primary/10 px-1 py-0.5 rounded">
                    {selectedTask.taskKey}
                  </span>
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {selectedTask.title}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTask(null)}
                >
                  Change
                </Button>
              </div>
            </div>
          )}

          {/* No Results */}
          {search.length >= 2 && !searching && searchResults.length === 0 && !selectedTask && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tasks found matching &ldquo;{search}&rdquo;
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!selectedTask || creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Link Issue
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
