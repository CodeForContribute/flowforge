"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  projectId: string;
  rows?: number;
  disabled?: boolean;
}

export function MentionInput({
  value,
  onChange,
  placeholder = "Add a comment...",
  projectId,
  rows = 3,
  disabled = false,
}: MentionInputProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Member[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch project members
  useEffect(() => {
    async function fetchMembers() {
      try {
        const response = await fetch(`/api/projects/${projectId}/members`);
        if (response.ok) {
          const data = await response.json();
          setMembers(data.members || []);
        }
      } catch (error) {
        console.error("Error fetching members:", error);
      }
    }
    fetchMembers();
  }, [projectId]);

  // Filter suggestions based on query
  useEffect(() => {
    if (mentionQuery) {
      const filtered = members.filter((m) =>
        m.user.name?.toLowerCase().includes(mentionQuery.toLowerCase())
      );
      setSuggestions(filtered);
      setSelectedIndex(0);
    } else {
      setSuggestions(members);
    }
  }, [mentionQuery, members]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      onChange(newValue);

      // Check if we're in a mention context
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_-]*)$/);

      if (mentionMatch) {
        setMentionStart(cursorPos - mentionMatch[0].length);
        setMentionQuery(mentionMatch[1]);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
        setMentionQuery("");
        setMentionStart(-1);
      }
    },
    [onChange]
  );

  const insertMention = useCallback(
    (member: Member) => {
      if (mentionStart === -1 || !textareaRef.current) return;

      const name = member.user.name || "User";
      const beforeMention = value.substring(0, mentionStart);
      const afterMention = value.substring(
        mentionStart + mentionQuery.length + 1
      );
      const newValue = `${beforeMention}@${name} ${afterMention}`;

      onChange(newValue);
      setShowSuggestions(false);
      setMentionQuery("");
      setMentionStart(-1);

      // Focus and set cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = mentionStart + name.length + 2;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [value, onChange, mentionStart, mentionQuery]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case "Enter":
        case "Tab":
          if (suggestions[selectedIndex]) {
            e.preventDefault();
            insertMention(suggestions[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          break;
      }
    },
    [showSuggestions, suggestions, selectedIndex, insertMention]
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="resize-none"
      />
      <p className="text-xs text-muted-foreground mt-1">
        Type @ to mention someone
      </p>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-64 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md"
        >
          {suggestions.map((member, index) => (
            <button
              key={member.userId}
              type="button"
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors",
                index === selectedIndex && "bg-accent"
              )}
              onClick={() => insertMention(member)}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={member.user.image || undefined} />
                <AvatarFallback className="text-xs">
                  {member.user.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{member.user.name || "User"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Render comment content with highlighted mentions
 */
export function CommentContent({ content }: { content: string }) {
  // Parse and highlight @mentions
  const parts = content.split(/(@[a-zA-Z0-9_-]+)/g);

  return (
    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.startsWith("@")) {
          return (
            <span
              key={index}
              className="text-primary font-medium bg-primary/10 px-1 rounded"
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </p>
  );
}
