"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SprintCard } from "./SprintCard";
import { SprintStatus } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
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

interface SprintStats {
  totalTasks: number;
  completedTasks: number;
  totalPoints: number;
  completedPoints: number;
  progress: number;
}

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  startDate: Date | string;
  endDate: Date | string;
  status: SprintStatus;
  projectId: string;
  stats: SprintStats;
}

interface SprintListProps {
  sprints: Sprint[];
  projectKey?: string;
  onCreateSprint?: () => void;
}

export function SprintList({ sprints, projectKey, onCreateSprint }: SprintListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Sprint | null>(null);

  const planningSprints = sprints.filter((s) => s.status === "PLANNING");
  const activeSprints = sprints.filter((s) => s.status === "ACTIVE");
  const completedSprints = sprints.filter((s) => s.status === "COMPLETED");

  async function handleStart(sprintId: string) {
    setLoading(sprintId);
    try {
      const response = await fetch(`/api/sprints/${sprintId}/start`, {
        method: "POST",
      });
      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to start sprint");
      }
    } catch (error) {
      console.error("Error starting sprint:", error);
      alert("An error occurred");
    } finally {
      setLoading(null);
    }
  }

  async function handleComplete(sprintId: string) {
    setLoading(sprintId);
    try {
      const response = await fetch(`/api/sprints/${sprintId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moveIncompleteTo: "backlog" }),
      });
      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to complete sprint");
      }
    } catch (error) {
      console.error("Error completing sprint:", error);
      alert("An error occurred");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(sprint: Sprint) {
    setLoading(sprint.id);
    try {
      const response = await fetch(`/api/sprints/${sprint.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete sprint");
      }
    } catch (error) {
      console.error("Error deleting sprint:", error);
      alert("An error occurred");
    } finally {
      setLoading(null);
      setDeleteConfirm(null);
    }
  }

  function renderSprintList(sprintList: Sprint[], emptyMessage: string) {
    if (sprintList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sprintList.map((sprint) => (
          <div key={sprint.id} className={loading === sprint.id ? "opacity-50" : ""}>
            <SprintCard
              sprint={sprint}
              projectKey={projectKey}
              onStart={() => handleStart(sprint.id)}
              onComplete={() => handleComplete(sprint.id)}
              onDelete={() => setDeleteConfirm(sprint)}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sprints</h2>
        {onCreateSprint && (
          <Button onClick={onCreateSprint} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Sprint
          </Button>
        )}
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeSprints.length})
          </TabsTrigger>
          <TabsTrigger value="planning">
            Planning ({planningSprints.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedSprints.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {renderSprintList(activeSprints, "No active sprints. Start a sprint to begin.")}
        </TabsContent>

        <TabsContent value="planning" className="mt-4">
          {renderSprintList(planningSprints, "No sprints in planning. Create a sprint to get started.")}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {renderSprintList(completedSprints, "No completed sprints yet.")}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sprint?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;? Tasks in this sprint will be moved to the backlog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading === deleteConfirm?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
