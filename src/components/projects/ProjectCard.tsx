import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, ListTodo } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    githubRepo: string;
    taskCount: number;
    activePRCount: number;
    updatedAt: Date;
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/project/${project.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            {project.activePRCount > 0 && (
              <Badge variant="info" className="ml-2">
                {project.activePRCount} PR{project.activePRCount !== 1 ? "s" : ""} open
              </Badge>
            )}
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
