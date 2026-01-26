import { Badge } from "@/components/ui/badge";
import { TaskPriority } from "@/types";
import { ArrowUp, ArrowDown, Minus, AlertTriangle } from "lucide-react";

const priorityConfig: Record<TaskPriority, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"; icon: typeof ArrowUp }> = {
  LOW: { label: "Low", variant: "secondary", icon: ArrowDown },
  MEDIUM: { label: "Medium", variant: "outline", icon: Minus },
  HIGH: { label: "High", variant: "warning", icon: ArrowUp },
  URGENT: { label: "Urgent", variant: "destructive", icon: AlertTriangle },
};

interface PriorityBadgeProps {
  priority: TaskPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
