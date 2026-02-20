import { Github } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const integrations = [
  {
    name: "GitHub",
    description:
      "Full integration with repositories, pull requests, issues, and Actions. Your entire workflow in one place.",
    icon: Github,
    status: "live" as const,
  },
  {
    name: "Jira",
    description:
      "Import existing Jira projects and sync tasks bi-directionally to ease your migration.",
    icon: null,
    status: "coming-soon" as const,
  },
  {
    name: "GitLab",
    description:
      "Connect GitLab repositories and merge requests for teams using GitLab as their primary platform.",
    icon: null,
    status: "coming-soon" as const,
  },
  {
    name: "Slack",
    description:
      "Get real-time notifications, create tasks from messages, and keep your team in sync.",
    icon: null,
    status: "coming-soon" as const,
  },
];

export function IntegrationsSection() {
  return (
    <section id="integrations" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Integrates with your{" "}
            <span className="gradient-text">favorite tools</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect the tools you already use and love. More integrations coming
            soon.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {integrations.map((integration, index) => (
            <Card
              key={integration.name}
              className={`relative overflow-hidden animate-fade-up ${
                integration.status === "live"
                  ? "border-primary/30 shadow-md shadow-primary/10"
                  : "opacity-75"
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    {integration.icon ? (
                      <integration.icon className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">
                        {integration.name[0]}
                      </span>
                    )}
                  </div>
                  {integration.status === "live" ? (
                    <Badge variant="success">Live</Badge>
                  ) : (
                    <Badge variant="secondary">Coming Soon</Badge>
                  )}
                </div>
                <CardTitle className="text-base">{integration.name}</CardTitle>
                <CardDescription className="text-sm">
                  {integration.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
