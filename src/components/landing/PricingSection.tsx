import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for individual developers and small side projects.",
    features: [
      "Up to 3 projects",
      "GitHub integration",
      "Basic AI suggestions",
      "Activity tracking",
      "Community support",
    ],
    cta: "Get Started",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "per user / month",
    description: "For growing teams that need advanced AI and collaboration features.",
    features: [
      "Unlimited projects",
      "Advanced AI code generation",
      "Sprint analytics & velocity",
      "Priority PR management",
      "Team collaboration tools",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "/login",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact sales",
    description: "For organizations that need advanced security, compliance, and support.",
    features: [
      "Everything in Pro",
      "SSO / SAML authentication",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantees",
      "On-premise deployment",
    ],
    cta: "Contact Sales",
    href: "mailto:sales@flowforge.dev",
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Simple, transparent{" "}
            <span className="gradient-text">pricing</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free and scale as your team grows. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {tiers.map((tier, index) => (
            <Card
              key={tier.name}
              className={`relative animate-fade-up ${
                tier.highlighted
                  ? "border-primary/50 shadow-xl shadow-primary/10 scale-[1.02]"
                  : ""
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="ai">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {tier.period}
                  </span>
                </div>
                <CardDescription className="mt-3">
                  {tier.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  variant={tier.highlighted ? "gradient" : "outline"}
                  className="w-full"
                  asChild
                >
                  <Link href={tier.href}>{tier.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
