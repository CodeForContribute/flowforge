import { Badge } from "@/components/ui/badge";
import { TaskStatus } from "@/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<TaskStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  BACKLOG: { label: "Backlog", variant: "secondary" },
  TODO: { label: "To Do", variant: "outline" },
  IN_PROGRESS: { label: "In Progress", variant: "info" },
  GENERATING: { label: "Generating", variant: "warning" },
  PR_OPEN: { label: "PR Open", variant: "info" },
  IN_REVIEW: { label: "In Review", variant: "warning" },
  CHANGES_REQUESTED: { label: "Changes Requested", variant: "destructive" },
  APPROVED: { label: "Approved", variant: "success" },
  MERGED: { label: "Merged", variant: "success" },
  CLOSED: { label: "Closed", variant: "secondary" },
};

interface StatusBadgeProps {
  status: TaskStatus;
  size?: "sm" | "default";
}

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge
      variant={config.variant}
      className={cn(size === "sm" && "text-xs py-0 px-1.5")}
    >
      {config.label}
    </Badge>
  );
}
