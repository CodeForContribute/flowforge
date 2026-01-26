"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, Trash2, Archive, Loader2 } from "lucide-react";

interface DangerZoneSettingsProps {
  projectId: string;
  projectName: string;
  taskCount: number;
}

export function DangerZoneSettings({
  projectId,
  projectName,
  taskCount,
}: DangerZoneSettingsProps) {
  const router = useRouter();
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  async function handleDeleteProject() {
    if (deleteConfirmation !== projectName) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("An error occurred while deleting the project");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            These actions are destructive and cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Archive Project */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
            <div>
              <div className="font-medium flex items-center gap-2">
                <Archive className="h-4 w-4 text-amber-600" />
                Archive Project
              </div>
              <div className="text-sm text-muted-foreground">
                Hide this project from your dashboard. You can unarchive it later.
              </div>
            </div>
            <Button variant="outline" disabled>
              Coming Soon
            </Button>
          </div>

          {/* Delete Project */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/30 bg-destructive/5">
            <div>
              <div className="font-medium text-destructive flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Project
              </div>
              <div className="text-sm text-muted-foreground">
                Permanently delete this project and all its data
              </div>
            </div>
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Project</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete the project
                    and all associated data.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-sm">
                    <p className="font-medium text-destructive">
                      You are about to delete:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                      <li>
                        <span className="font-semibold">{projectName}</span> project
                      </li>
                      <li>{taskCount} tasks and all their data</li>
                      <li>All execution history and logs</li>
                      <li>All comments and labels</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">
                      Type <span className="font-mono font-bold">{projectName}</span> to
                      confirm
                    </Label>
                    <Input
                      id="confirm"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder={projectName}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteDialog(false);
                      setDeleteConfirmation("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={deleteConfirmation !== projectName || isDeleting}
                    onClick={handleDeleteProject}
                  >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete Project
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-muted-foreground">Total Tasks</div>
              <div className="text-2xl font-bold">{taskCount}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-muted-foreground">Project ID</div>
              <div className="font-mono text-xs truncate">{projectId}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
