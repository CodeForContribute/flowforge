"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TaskTypeBadge } from "./TaskTypeBadge";
import { LinkTaskDialog } from "./LinkTaskDialog";
import {
  Link2,
  Plus,
  Trash2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { TaskStatus, TaskType, LinkType } from "@/types";
import { cn } from "@/lib/utils";

interface LinkedTask {
  id: string;
  title: string;
  taskKey: string;
  status: TaskStatus;
  taskType: TaskType;
}

interface TaskLinkDisplay {
  id: string;
  linkType: LinkType;
  direction: "outward" | "inward";
  displayType: string;
  linkedTask: LinkedTask;
  createdAt: Date;
}

interface TaskLinksSectionProps {
  taskId: string;
  projectId: string;
  projectKey?: string;
}

const linkTypeColors: Record<LinkType, string> = {
  BLOCKS: "text-red-500",
  RELATES_TO: "text-blue-500",
  DUPLICATES: "text-amber-500",
};

const linkTypeIcons: Record<LinkType, React.ReactNode> = {
  BLOCKS: <AlertCircle className="h-3.5 w-3.5" />,
  RELATES_TO: <Link2 className="h-3.5 w-3.5" />,
  DUPLICATES: <Link2 className="h-3.5 w-3.5" />,
};

export function TaskLinksSection({
  taskId,
  projectId,
  projectKey,
}: TaskLinksSectionProps) {
  const router = useRouter();
  const [links, setLinks] = useState<TaskLinkDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function fetchLinks() {
    try {
      const response = await fetch(`/api/tasks/${taskId}/links`);
      if (response.ok) {
        const data = await response.json();
        setLinks(data.links);
      }
    } catch (error) {
      console.error("Error fetching links:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(linkId: string) {
    setDeletingId(linkId);
    try {
      const response = await fetch(`/api/tasks/${taskId}/links/${linkId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setLinks((prev) => prev.filter((link) => link.id !== linkId));
      }
    } catch (error) {
      console.error("Error deleting link:", error);
    } finally {
      setDeletingId(null);
    }
  }

  function handleLinkCreated() {
    fetchLinks();
    router.refresh();
  }

  // Group links by type for better organization
  const groupedLinks = links.reduce(
    (acc, link) => {
      const key = link.displayType;
      if (!acc[key]) acc[key] = [];
      acc[key].push(link);
      return acc;
    },
    {} as Record<string, TaskLinkDisplay[]>
  );

  const hasBlockingLinks = links.some(
    (link) => link.linkType === "BLOCKS" && link.direction === "inward"
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            Linked Issues
            {links.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({links.length})
              </span>
            )}
            {hasBlockingLinks && (
              <span className="flex items-center gap-1 text-xs text-red-500 bg-red-500/10 px-2 py-0.5 rounded">
                <AlertCircle className="h-3 w-3" />
                Blocked
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="h-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : links.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No linked issues. Click + to link an issue.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedLinks).map(([displayType, groupLinks]) => (
              <div key={displayType} className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  {groupLinks[0].direction === "outward" ? (
                    <ArrowRight className="h-3 w-3" />
                  ) : (
                    <ArrowLeft className="h-3 w-3" />
                  )}
                  {displayType}
                </div>
                {groupLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-accent group"
                  >
                    <span className={cn(linkTypeColors[link.linkType])}>
                      {linkTypeIcons[link.linkType]}
                    </span>
                    <TaskTypeBadge
                      type={link.linkedTask.taskType}
                      size="sm"
                      showLabel={false}
                    />
                    <Link
                      href={`/project/${projectKey || projectId}/task/${link.linkedTask.taskKey || link.linkedTask.id}`}
                      className="text-xs font-mono text-primary/80 bg-primary/10 px-1 py-0.5 rounded shrink-0 hover:bg-primary/20 transition-colors"
                    >
                      {link.linkedTask.taskKey}
                    </Link>
                    <Link
                      href={`/project/${projectKey || projectId}/task/${link.linkedTask.taskKey || link.linkedTask.id}`}
                      className="flex-1 text-sm truncate hover:text-primary transition-colors"
                    >
                      {link.linkedTask.title}
                    </Link>
                    <StatusBadge status={link.linkedTask.status} size="sm" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(link.id)}
                      disabled={deletingId === link.id}
                    >
                      {deletingId === link.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <LinkTaskDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          taskId={taskId}
          projectId={projectId}
          onLinkCreated={handleLinkCreated}
        />
      </CardContent>
    </Card>
  );
}
