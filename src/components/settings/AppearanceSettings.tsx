"use client";

import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sun, Moon, Monitor, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = [
  {
    value: "light",
    label: "Light",
    description: "Light mode for bright environments",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Dark mode for low-light environments",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Automatically match your system settings",
    icon: Monitor,
  },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme
          </CardTitle>
          <CardDescription>
            Choose how FlowForge looks to you. Select a theme preference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={theme}
            onValueChange={setTheme}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {themes.map((t) => (
              <Label
                key={t.value}
                htmlFor={t.value}
                className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  theme === t.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <RadioGroupItem value={t.value} id={t.value} className="sr-only" />
                <div
                  className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                    theme === t.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <t.icon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            See how your selected theme looks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary" />
              <div className="space-y-1">
                <div className="h-4 w-32 rounded bg-foreground/20" />
                <div className="h-3 w-24 rounded bg-muted-foreground/20" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 rounded-lg bg-primary" />
              <div className="h-8 w-20 rounded-lg bg-secondary" />
              <div className="h-8 w-20 rounded-lg bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
              <div className="h-3 w-3/5 rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
