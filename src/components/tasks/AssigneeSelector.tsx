"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface Member {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    email: string;
  };
}

interface AssigneeSelectorProps {
  projectId: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export function AssigneeSelector({
  projectId,
  value,
  onChange,
  disabled,
}: AssigneeSelectorProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const response = await fetch(`/api/projects/${projectId}/members`);
        if (response.ok) {
          const data = await response.json();
          setMembers(data.members);
        }
      } catch (error) {
        console.error("Error fetching members:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [projectId]);

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading..." />
        </SelectTrigger>
      </Select>
    );
  }

  const selectedMember = members.find((m) => m.user.id === value);

  return (
    <Select
      value={value || "none"}
      onValueChange={(val) => onChange(val === "none" ? null : val)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Unassigned">
          {selectedMember ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedMember.user.image || undefined} />
                <AvatarFallback className="text-xs">
                  {selectedMember.user.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span>{selectedMember.user.name || selectedMember.user.email}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Unassigned</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Unassigned</span>
          </div>
        </SelectItem>
        {members.map((member) => (
          <SelectItem key={member.user.id} value={member.user.id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={member.user.image || undefined} />
                <AvatarFallback className="text-xs">
                  {member.user.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span>{member.user.name || member.user.email}</span>
              {member.role === "OWNER" && (
                <span className="text-xs text-muted-foreground">(Owner)</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
