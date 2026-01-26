"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Target,
  Play,
  CheckCircle2,
  Clock,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SprintStatus } from "@/types";
import { format } from "date-fns";

interface SprintStats {
  totalTasks: number;
  completedTasks: number;
  totalPoints: number;
  completedPoints: number;
  progress: number;
}

interface SprintCardProps {
  sprint: {
    id: string;
    name: string;
    goal: string | null;
    startDate: Date | string;
    endDate: Date | string;
    status: SprintStatus;
    projectId: string;
    stats: SprintStats;
  };
  onStart?: () => void;
  onComplete?: () => void;
  onDelete?: () => void;
}

const statusConfig: Record<SprintStatus, { label: string; variant: "default" | "secondary" | "outline"; icon: typeof Clock }> = {
  PLANNING: { label: "Planning", variant: "secondary", icon: Clock },
  ACTIVE: { label: "Active", variant: "default", icon: Play },
  COMPLETED: { label: "Completed", variant: "outline", icon: CheckCircle2 },
};

export function SprintCard({ sprint, onStart, onComplete, onDelete }: SprintCardProps) {
  const config = statusConfig[sprint.status];
  const StatusIcon = config.icon;
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);
  const now = new Date();
  const isOverdue = sprint.status === "ACTIVE" && now > endDate;

  return (
    <Card className={isOverdue ? "border-destructive" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Link
              href={`/project/${sprint.projectId}/sprint/${sprint.id}`}
              className="hover:underline"
            >
              <CardTitle className="text-lg">{sprint.name}</CardTitle>
            </Link>
            <div className="flex items-center gap-2">
              <Badge variant={config.variant} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive">Overdue</Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sprint.status === "PLANNING" && onStart && (
                <DropdownMenuItem onClick={onStart}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Sprint
                </DropdownMenuItem>
              )}
              {sprint.status === "ACTIVE" && onComplete && (
                <DropdownMenuItem onClick={onComplete}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete Sprint
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  Delete Sprint
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sprint.goal && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="line-clamp-2">{sprint.goal}</p>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {sprint.stats.completedTasks}/{sprint.stats.totalTasks} tasks
              {sprint.stats.totalPoints > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  ({sprint.stats.completedPoints}/{sprint.stats.totalPoints} pts)
                </span>
              )}
            </span>
          </div>
          <Progress value={sprint.stats.progress} />
        </div>
      </CardContent>
    </Card>
  );
}
