"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Workflow } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <Workflow className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to FlowForge</CardTitle>
          <CardDescription>
            AI-powered SDLC automation platform. Connect your GitHub account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            size="lg"
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          >
            <Github className="mr-2 h-5 w-5" />
            Continue with GitHub
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            By signing in, you grant FlowForge access to your repositories for code generation and PR management.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
