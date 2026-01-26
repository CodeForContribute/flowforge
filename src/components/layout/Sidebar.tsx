"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FolderKanban,
  Plus,
  LayoutDashboard,
  Settings,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
}

interface SidebarProps {
  projects?: Project[];
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
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="p-4">
        <Button asChild className="w-full justify-start">
          <Link href="/project/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-4">
          {mainNav.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? "secondary" : "ghost"}
              className="w-full justify-start"
              asChild
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </Link>
            </Button>
          ))}
        </div>
        <Separator />
        <div className="py-4">
          <h4 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Projects
          </h4>
          <div className="space-y-1">
            {projects.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">No projects yet</p>
            ) : (
              projects.map((project) => (
                <Button
                  key={project.id}
                  variant={pathname.startsWith(`/project/${project.id}`) ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={`/project/${project.id}`}>
                    <FolderKanban className="mr-2 h-4 w-4" />
                    <span className="truncate">{project.name}</span>
                  </Link>
                </Button>
              ))
            )}
          </div>
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-3">
        <Button
          variant={pathname === "/settings" ? "secondary" : "ghost"}
          className="w-full justify-start"
          asChild
        >
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>
    </div>
  );
}
