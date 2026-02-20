import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { CTASection } from "@/components/landing/CTASection";
import { FooterSection } from "@/components/landing/FooterSection";

export const metadata = {
  title: "FlowForge — AI-Powered Project Management for Dev Teams",
  description:
    "Ship software faster with AI code generation, GitHub integration, and smart sprint planning. FlowForge is the project management platform built for modern development teams.",
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session;

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNavbar isAuthenticated={isAuthenticated} />
      <main className="flex-1">
        <HeroSection isAuthenticated={isAuthenticated} />
        <FeaturesSection />
        <HowItWorksSection />
        <IntegrationsSection />
        <TestimonialsSection />
        <PricingSection />
        <CTASection isAuthenticated={isAuthenticated} />
      </main>
      <FooterSection />
    </div>
  );
}
