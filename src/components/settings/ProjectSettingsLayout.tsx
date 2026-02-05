"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Users, Tag, AlertTriangle, Sparkles, LayoutGrid, Workflow, Zap, Package, Settings2, Webhook, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectSettingsLayoutProps {
  children: React.ReactNode;
  projectId: string;
  projectKey?: string;
  projectName: string;
}

export function ProjectSettingsLayout({
  children,
  projectId,
  projectKey,
  projectName,
}: ProjectSettingsLayoutProps) {
  const pathname = usePathname();
  const projectSlug = projectKey || projectId;

  const settingsNav = [
    {
      title: "General",
      href: `/project/${projectSlug}/settings`,
      icon: Settings,
    },
    {
      title: "Board",
      href: `/project/${projectSlug}/settings/board`,
      icon: LayoutGrid,
    },
    {
      title: "Workflow",
      href: `/project/${projectSlug}/settings/workflow`,
      icon: Workflow,
    },
    {
      title: "Automation",
      href: `/project/${projectSlug}/settings/automation`,
      icon: Zap,
    },
    {
      title: "AI Integrations",
      href: `/project/${projectSlug}/settings/ai`,
      icon: Sparkles,
    },
    {
      title: "Members",
      href: `/project/${projectSlug}/settings/members`,
      icon: Users,
    },
    {
      title: "Labels",
      href: `/project/${projectSlug}/settings/labels`,
      icon: Tag,
    },
    {
      title: "Custom Fields",
      href: `/project/${projectSlug}/settings/custom-fields`,
      icon: Settings2,
    },
    {
      title: "Versions",
      href: `/project/${projectSlug}/settings/versions`,
      icon: Package,
    },
    {
      title: "Webhooks",
      href: `/project/${projectSlug}/settings/webhooks`,
      icon: Webhook,
    },
    {
      title: "Slack",
      href: `/project/${projectSlug}/settings/slack`,
      icon: MessageSquare,
    },
    {
      title: "Danger Zone",
      href: `/project/${projectSlug}/settings/danger`,
      icon: AlertTriangle,
      danger: true,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      <div className="mb-8">
        <div className="text-sm text-muted-foreground mb-1">Project Settings</div>
        <h1 className="text-3xl font-bold">{projectName}</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <nav className="md:w-56 space-y-1">
          {settingsNav.map((item) => {
            const isActive =
              item.href === `/project/${projectSlug}/settings`
                ? pathname === item.href || pathname === `/project/${projectId}/settings`
                : pathname.startsWith(item.href) || pathname.startsWith(item.href.replace(projectSlug, projectId));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                  isActive
                    ? item.danger
                      ? "bg-destructive/10 text-destructive border border-destructive/20"
                      : "bg-primary/10 text-primary border border-primary/20"
                    : item.danger
                      ? "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive && (item.danger ? "text-destructive" : "text-primary"))} />
                <span className="font-medium">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
