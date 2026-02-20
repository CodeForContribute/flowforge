import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "FlowForge cut our sprint planning time in half. The AI suggestions are surprisingly accurate and the GitHub integration is seamless.",
    author: "Sarah Chen",
    role: "Engineering Lead",
    company: "TechStart",
  },
  {
    quote:
      "We switched from Jira and never looked back. The AI code generation feature alone saves us hours every week.",
    author: "Marcus Johnson",
    role: "CTO",
    company: "DevScale",
  },
  {
    quote:
      "Finally, a project management tool that understands how developers actually work. The PR tracking is a game-changer.",
    author: "Priya Patel",
    role: "Senior Developer",
    company: "CloudNine",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Loved by{" "}
            <span className="gradient-text">development teams</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See what teams are saying about FlowForge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card
              key={testimonial.author}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <blockquote className="text-sm leading-relaxed text-muted-foreground mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div>
                  <p className="font-semibold text-sm">{testimonial.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
