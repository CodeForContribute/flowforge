import {
  Sparkles,
  GitPullRequest,
  LayoutDashboard,
  Github,
  Users,
  Activity,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const features = [
  {
    icon: Sparkles,
    title: "AI Code Generation",
    description:
      "Generate code, tests, and documentation with AI assistance directly from your tasks and user stories.",
  },
  {
    icon: GitPullRequest,
    title: "PR Management",
    description:
      "Automatically link pull requests to tasks, track review status, and streamline your merge workflow.",
  },
  {
    icon: LayoutDashboard,
    title: "Sprint Planning",
    description:
      "Plan and manage sprints with drag-and-drop boards, velocity tracking, and AI-powered estimations.",
  },
  {
    icon: Github,
    title: "GitHub Integration",
    description:
      "Deep GitHub integration syncs repos, branches, issues, and PRs in real time with your project board.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Invite team members, assign tasks, and collaborate with comments, mentions, and real-time updates.",
  },
  {
    icon: Activity,
    title: "Activity Tracking",
    description:
      "Track every action across your project with a detailed activity feed and analytics dashboard.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Everything you need to{" "}
            <span className="gradient-text">ship faster</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A complete project management platform built for modern development
            teams, powered by AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="group relative overflow-hidden animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] flex items-center justify-center mb-4 shadow-md shadow-primary/20">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
