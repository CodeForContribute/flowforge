"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Crown, Shield, User, Trash2, Loader2 } from "lucide-react";
import { MemberRole } from "@/types";

interface Member {
  id: string;
  role: MemberRole;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface MemberListProps {
  members: Member[];
  projectId: string;
  currentUserId: string;
  isOwner: boolean;
}

const roleConfig: Record<MemberRole, { label: string; icon: typeof Crown; color: string }> = {
  OWNER: { label: "Owner", icon: Crown, color: "text-yellow-500" },
  ADMIN: { label: "Admin", icon: Shield, color: "text-blue-500" },
  MEMBER: { label: "Member", icon: User, color: "text-muted-foreground" },
};

export function MemberList({ members, projectId, currentUserId, isOwner }: MemberListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Member | null>(null);

  async function handleRoleChange(memberId: string, newRole: MemberRole) {
    if (newRole === "OWNER") return; // Cannot assign owner role
    setLoadingId(memberId);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/members/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      alert("An error occurred");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRemove(member: Member) {
    setLoadingId(member.id);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/members/${member.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to remove member");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      alert("An error occurred");
    } finally {
      setLoadingId(null);
      setDeleteConfirm(null);
    }
  }

  return (
    <>
      <div className="space-y-2">
        {members.map((member) => {
          const config = roleConfig[member.role];
          const RoleIcon = config.icon;
          const isCurrentUser = member.userId === currentUserId;
          const canManage = isOwner && member.role !== "OWNER";

          return (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.user.image || undefined} />
                    <AvatarFallback>
                      {member.user.name?.charAt(0) || member.user.email.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {member.user.name || member.user.email}
                      </p>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {member.user.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManage ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          handleRoleChange(member.id, value as MemberRole)
                        }
                        disabled={loadingId === member.id}
                      >
                        <SelectTrigger className="w-32">
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
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <RoleIcon className={`h-3 w-3 ${config.color}`} />
                        {config.label}
                      </Badge>
                    )}

                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirm(member)}
                        disabled={loadingId === member.id}
                      >
                        {loadingId === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    {isCurrentUser && !isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirm(member)}
                      >
                        Leave
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm?.userId === currentUserId
                ? "Leave Project?"
                : "Remove Member?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.userId === currentUserId
                ? "You will no longer have access to this project."
                : `${deleteConfirm?.user.name || deleteConfirm?.user.email} will be removed from this project. Their assigned tasks will be unassigned.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleRemove(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteConfirm?.userId === currentUserId ? "Leave" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
