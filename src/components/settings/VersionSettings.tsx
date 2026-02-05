"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  Archive,
} from "lucide-react";
import { Version, VersionStatus } from "@/types";
import { format } from "date-fns";

interface VersionSettingsProps {
  projectId: string;
}

const statusConfig: Record<VersionStatus, { label: string; icon: typeof Clock; color: string }> = {
  UNRELEASED: { label: "Unreleased", icon: Clock, color: "bg-amber-500" },
  RELEASED: { label: "Released", icon: CheckCircle2, color: "bg-green-500" },
  ARCHIVED: { label: "Archived", icon: Archive, color: "bg-slate-500" },
};

export function VersionSettings({ projectId }: VersionSettingsProps) {
  const router = useRouter();
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingVersion, setEditingVersion] = useState<Version | null>(null);
  const [deleteVersion, setDeleteVersion] = useState<Version | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [status, setStatus] = useState<VersionStatus>("UNRELEASED");

  useEffect(() => {
    fetchVersions();
  }, [projectId]);

  async function fetchVersions() {
    try {
      const response = await fetch(`/api/projects/${projectId}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
      }
    } catch (error) {
      console.error("Error fetching versions:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setDescription("");
    setReleaseDate("");
    setStatus("UNRELEASED");
  }

  function openEditDialog(version: Version) {
    setEditingVersion(version);
    setName(version.name);
    setDescription(version.description || "");
    setReleaseDate(version.releaseDate ? format(new Date(version.releaseDate), "yyyy-MM-dd") : "");
    setStatus(version.status);
  }

  async function handleSave() {
    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    setIsSaving(true);
    try {
      const url = editingVersion
        ? `/api/projects/${projectId}/versions/${editingVersion.id}`
        : `/api/projects/${projectId}/versions`;

      const response = await fetch(url, {
        method: editingVersion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          releaseDate: releaseDate || null,
          status,
        }),
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setEditingVersion(null);
        resetForm();
        fetchVersions();
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save version");
      }
    } catch (error) {
      console.error("Error saving version:", error);
      alert("An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteVersion) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/versions/${deleteVersion.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setDeleteVersion(null);
        fetchVersions();
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete version");
      }
    } catch (error) {
      console.error("Error deleting version:", error);
      alert("An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Versions / Releases
            </CardTitle>
            <CardDescription>
              Group tasks by version and track release progress
            </CardDescription>
          </div>
          <Dialog
            open={showCreateDialog || !!editingVersion}
            onOpenChange={(open) => {
              if (!open) {
                setShowCreateDialog(false);
                setEditingVersion(null);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingVersion ? "Edit Version" : "Create Version"}
                </DialogTitle>
                <DialogDescription>
                  {editingVersion
                    ? "Update version details"
                    : "Create a new version to group related tasks"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., v1.0.0, Sprint 5 Release"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What's included in this release?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="releaseDate">Release Date</Label>
                    <Input
                      id="releaseDate"
                      type="date"
                      value={releaseDate}
                      onChange={(e) => setReleaseDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as VersionStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(statusConfig) as VersionStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>
                            {statusConfig[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setEditingVersion(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingVersion ? "Save Changes" : "Create Version"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No versions created yet</p>
            <p className="text-sm">Create a version to start organizing your releases</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Release Date</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version) => {
                const config = statusConfig[version.status];
                const StatusIcon = config.icon;

                return (
                  <TableRow key={version.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{version.name}</div>
                        {version.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {version.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {version.releaseDate
                        ? format(new Date(version.releaseDate), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>{version._count?.tasks || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(version)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteVersion(version)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteVersion} onOpenChange={() => setDeleteVersion(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Version?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deleteVersion?.name}&quot;? Tasks assigned
                to this version will be unassigned. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
