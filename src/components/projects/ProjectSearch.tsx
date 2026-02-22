"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectCard } from "./ProjectCard";

interface Project {
  id: string;
  name: string;
  description: string | null;
  githubRepo: string;
  projectKey?: string;
  taskCount: number;
  activePRCount: number;
  updatedAt: Date;
  aiEnabled?: boolean;
}

interface ProjectListWithSearchProps {
  projects: Project[];
}

export function ProjectListWithSearch({ projects }: ProjectListWithSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = searchQuery
    ? projects.filter((project) => {
        const query = searchQuery.toLowerCase();
        return (
          project.name.toLowerCase().includes(query) ||
          (project.projectKey && project.projectKey.toLowerCase().includes(query))
        );
      })
    : projects;

  return (
    <>
      <div className="flex items-center justify-between mb-8" data-tour-id="dashboard-header">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your FlowForge projects and tasks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button asChild variant="gradient" className="shadow-lg shadow-primary/20" data-tour-id="new-project-button">
            <Link href="/project/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.length === 0 ? (
          <p className="col-span-full text-center text-sm text-muted-foreground py-8">
            No projects found for &ldquo;{searchQuery}&rdquo;
          </p>
        ) : (
          filteredProjects.map((project, index) => (
            <div
              key={project.id}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ProjectCard project={project} />
            </div>
          ))
        )}
      </div>
    </>
  );
}
