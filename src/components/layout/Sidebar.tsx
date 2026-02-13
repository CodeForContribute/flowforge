"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  projectKey?: string;
}

interface SidebarProps {
  projects?: Project[];
}

const projectColors = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-lime-500",
];

function getProjectColor(id: string): string {
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return projectColors[hash % projectColors.length];
}

export function Sidebar({ projects = [] }: SidebarProps) {
  const pathname = usePathname();

  const mainNav = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r border-border/40 bg-card/50 backdrop-blur-sm" data-tour-id="sidebar">
      <div className="p-4">
        <Button asChild variant="gradient" className="w-full justify-start shadow-lg shadow-primary/20">
          <Link href="/project/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>
      <Separator className="opacity-50" />
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-4">
          {mainNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "w-full justify-start transition-all",
                  isActive && "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className={cn("mr-2 h-4 w-4", isActive && "text-primary")} />
                  {item.title}
                </Link>
              </Button>
            );
          })}
        </div>
        <Separator className="opacity-50" />
        <div className="py-4">
          <h4 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Projects
          </h4>
          <div className="space-y-1">
            {projects.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">No projects yet</p>
            ) : (
              projects.map((project) => {
                const projectSlug = project.projectKey || project.id;
                const isActive = pathname.startsWith(`/project/${project.id}`) || pathname.startsWith(`/project/${project.projectKey}`);
                const colorClass = getProjectColor(project.id);
                return (
                  <Button
                    key={project.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start transition-all",
                      isActive && "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                    )}
                    asChild
                  >
                    <Link href={`/project/${projectSlug}`}>
                      <div className={cn("mr-2 h-2 w-2 rounded-full", colorClass)} />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  </Button>
                );
              })
            )}
          </div>
        </div>
      </ScrollArea>
      <Separator className="opacity-50" />
      <div className="p-3">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start transition-all",
            pathname === "/settings" && "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
          )}
          asChild
          data-tour-id="settings-link"
        >
          <Link href="/settings">
            <Settings className={cn("mr-2 h-4 w-4", pathname === "/settings" && "text-primary")} />
            Settings
          </Link>
        </Button>
      </div>
    </div>
  );
}
