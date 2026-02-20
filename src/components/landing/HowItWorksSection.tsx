import { Github, ListChecks, Rocket } from "lucide-react";

const steps = [
  {
    number: "1",
    icon: Github,
    title: "Connect GitHub",
    description:
      "Sign in with GitHub and connect your repositories. FlowForge syncs your repos, branches, and pull requests automatically.",
  },
  {
    number: "2",
    icon: ListChecks,
    title: "Create Tasks",
    description:
      "Break down your project into tasks and user stories. Use AI to generate subtasks, estimates, and even code scaffolding.",
  },
  {
    number: "3",
    icon: Rocket,
    title: "Ship with Confidence",
    description:
      "Track progress across sprints, review PRs in context, and deploy knowing every task has been completed and tested.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Get started in{" "}
            <span className="gradient-text">three simple steps</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From zero to productive in minutes — no complex setup required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="relative text-center animate-fade-up"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {/* Connector line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/30 to-primary/10" />
              )}

              <div className="relative inline-flex items-center justify-center mb-6">
                <div className="absolute inset-0 h-20 w-20 rounded-2xl bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] blur-xl opacity-30 animate-pulse-soft" />
                <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] flex items-center justify-center shadow-lg shadow-primary/30">
                  <step.icon className="h-8 w-8 text-white" />
                </div>
                <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xs font-bold text-primary">
                  {step.number}
                </span>
              </div>

              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
