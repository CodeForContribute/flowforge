"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Workflow } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />

      {/* Animated floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      {/* Login card */}
      <Card className="relative w-full max-w-md mx-4 border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/10 animate-scale-in">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-purple-500/5 pointer-events-none" />
        <CardHeader className="text-center relative">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] rounded-2xl blur-xl opacity-50 animate-pulse-soft" />
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] flex items-center justify-center shadow-lg shadow-primary/30">
                <Workflow className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">
              FlowForge
            </span>
          </CardTitle>
          <CardDescription className="text-base mt-2">
            AI-powered SDLC automation platform. Connect your GitHub account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <Button
            variant="gradient"
            className="w-full h-12 text-base"
            size="lg"
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          >
            <Github className="mr-2 h-5 w-5" />
            Continue with GitHub
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            By signing in, you grant FlowForge access to your repositories for code generation and PR management.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
