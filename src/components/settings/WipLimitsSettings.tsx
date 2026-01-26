"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Gauge, Loader2, Info } from "lucide-react";
import { TaskStatus } from "@/types";

// Columns that support WIP limits (active work columns)
const WIP_LIMIT_COLUMNS: { id: TaskStatus; title: string; description: string }[] = [
  { id: "TODO", title: "To Do", description: "Tasks ready to be worked on" },
  { id: "IN_PROGRESS", title: "In Progress", description: "Tasks currently being worked on" },
  { id: "IN_REVIEW", title: "In Review", description: "Tasks awaiting code review" },
  { id: "CHANGES_REQUESTED", title: "Changes Requested", description: "Tasks needing revisions" },
];

type WipLimits = Record<string, number>;

interface WipLimitsSettingsProps {
  project: {
    id: string;
    wipLimits: WipLimits | null;
  };
  isOwner: boolean;
}

export function WipLimitsSettings({ project, isOwner }: WipLimitsSettingsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [wipLimits, setWipLimits] = useState<WipLimits>(
    (project.wipLimits as WipLimits) || {}
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wipLimits }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update WIP limits");
      }
    } catch (error) {
      console.error("Error updating WIP limits:", error);
      alert("An error occurred while updating WIP limits");
    } finally {
      setIsLoading(false);
    }
  }

  function handleLimitChange(columnId: string, value: string) {
    const numValue = parseInt(value, 10);
    if (value === "" || isNaN(numValue)) {
      const newLimits = { ...wipLimits };
      delete newLimits[columnId];
      setWipLimits(newLimits);
    } else if (numValue >= 0) {
      setWipLimits({ ...wipLimits, [columnId]: numValue });
    }
  }

  function clearAllLimits() {
    setWipLimits({});
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          WIP Limits
        </CardTitle>
        <CardDescription>
          Set Work-In-Progress limits for Kanban columns to improve flow and reduce context switching
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-muted/50 p-4 mb-6">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">What are WIP limits?</p>
              <p className="mt-1">
                WIP (Work-In-Progress) limits help teams focus by restricting how many tasks can be in each column.
                When a column exceeds its limit, it will be highlighted in red on the Kanban board.
                Leave blank or set to 0 for no limit.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            {WIP_LIMIT_COLUMNS.map((column) => (
              <div
                key={column.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div>
                  <Label htmlFor={`wip-${column.id}`} className="font-medium">
                    {column.title}
                  </Label>
                  <p className="text-sm text-muted-foreground">{column.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id={`wip-${column.id}`}
                    type="number"
                    min="0"
                    max="100"
                    value={wipLimits[column.id] ?? ""}
                    onChange={(e) => handleLimitChange(column.id, e.target.value)}
                    placeholder="No limit"
                    className="w-24 text-center"
                    disabled={!isOwner}
                  />
                  <span className="text-sm text-muted-foreground w-12">tasks</span>
                </div>
              </div>
            ))}
          </div>

          {isOwner && (
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save WIP Limits
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={clearAllLimits}
                disabled={isLoading || Object.keys(wipLimits).length === 0}
              >
                Clear All
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
