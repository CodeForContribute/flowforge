"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Loader2, Github, Shield, User } from "lucide-react";

interface InviteMemberFormProps {
  projectId: string;
}

export function InviteMemberForm({ projectId }: InviteMemberFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubUsername: username,
          role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`${data.member.user.name || username} has been added to the project.`);
        setUsername("");
        router.refresh();
      } else {
        setError(data.error || "Failed to add member");
      }
    } catch (err) {
      console.error("Error adding member:", err);
      setError("An error occurred while adding the member");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Invite Member
        </CardTitle>
        <CardDescription>
          Add a team member by their GitHub username. They must have a FlowForge account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="username">GitHub Username</Label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="octocat"
                  className="pl-9"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="w-40 space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as "ADMIN" | "MEMBER")}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-blue-500" />
                      Admin
                    </div>
                  </SelectItem>
                  <SelectItem value="MEMBER">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      Member
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          )}

          <Button type="submit" disabled={isLoading || !username.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Member
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Role Permissions</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <span className="font-medium text-foreground">Admin</span>
                <p>Can manage sprints, labels, and team members</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="font-medium text-foreground">Member</span>
                <p>Can create and manage tasks</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
