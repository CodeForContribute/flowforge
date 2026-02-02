"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Palette, Shield, Bell, Github, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTour } from "@/hooks/useTour";
import { sectionTours } from "@/components/onboarding/tour-steps";

const settingsNav = [
  {
    title: "Profile",
    href: "/settings",
    icon: User,
    description: "Manage your personal information",
  },
  {
    title: "Appearance",
    href: "/settings/appearance",
    icon: Palette,
    description: "Customize the look and feel",
  },
  {
    title: "Connections",
    href: "/settings/connections",
    icon: Github,
    description: "Manage connected accounts",
  },
  {
    title: "Notifications",
    href: "/settings/notifications",
    icon: Bell,
    description: "Configure notification preferences",
  },
  {
    title: "Security",
    href: "/settings/security",
    icon: Shield,
    description: "Security and privacy settings",
  },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const { restartTour, toursCompleted } = useTour();

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <nav className="md:w-64 space-y-1">
          {settingsNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                <div>
                  <div className="font-medium">{item.title}</div>
                </div>
              </Link>
            );
          })}

          {/* Tour Section */}
          <div className="pt-4 mt-4 border-t border-border/50">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Guided Tours
            </h4>
            <div className="space-y-1">
              {sectionTours.map((tour) => {
                const isCompleted = toursCompleted[tour.id];
                return (
                  <Button
                    key={tour.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => restartTour(tour.id)}
                    className="w-full justify-between text-muted-foreground hover:text-foreground group"
                  >
                    <span className="flex items-center gap-2">
                      <RotateCcw className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="text-xs">{tour.name}</span>
                    </span>
                    {isCompleted && (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
