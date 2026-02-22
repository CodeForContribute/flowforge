import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, ListTodo, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    githubRepo: string;
    projectKey?: string;
    taskCount: number;
    activePRCount: number;
    updatedAt: Date;
    aiEnabled?: boolean;
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/project/${project.projectKey || project.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <div className="flex items-center gap-1.5 ml-2">
              {project.aiEnabled && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  AI
                </Badge>
              )}
              {project.activePRCount > 0 && (
                <Badge variant="info">
                  {project.activePRCount} PR{project.activePRCount !== 1 ? "s" : ""} open
                </Badge>
              )}
            </div>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Github className="h-4 w-4" />
              <span className="truncate max-w-[150px]">{project.githubRepo}</span>
            </div>
            <div className="flex items-center gap-1">
              <ListTodo className="h-4 w-4" />
              <span>{project.taskCount} tasks</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Updated {formatDate(project.updatedAt)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
