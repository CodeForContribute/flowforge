"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MentionInput, CommentContent } from "./MentionInput";
import {
  Bot,
  Send,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  SmilePlus,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Code,
  Users,
  Workflow,
  Check,
  X,
  CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { User } from "@/types";

interface Reaction {
  emoji: string;
  count: number;
  users: { id: string; name: string | null; image: string | null }[];
  hasReacted: boolean;
}

interface CommentData {
  id: string;
  content: string;
  type?: string;
  isSystem: boolean;
  metadata?: unknown;
  createdAt: Date | string;
  updatedAt?: Date | string;
  userId: string | null;
  user: User | null;
  reactions?: {
    id: string;
    emoji: string;
    userId: string;
    user: { id: string; name: string | null; image: string | null };
  }[];
}

interface CommentsSectionProps {
  taskId: string;
  projectId: string;
  comments: CommentData[];
  currentUserId: string;
}

const REACTION_EMOJIS = ["👍", "👎", "❤️", "🎉", "😄", "😕", "👀", "🚀"];

const ACTIVITY_ICONS: Record<string, typeof GitBranch> = {
  branch: GitBranch,
  code: Code,
  commit: GitCommit,
  pr: GitPullRequest,
  review: Users,
  build: Workflow,
};

// Parse activity summary from JSON content
function parseActivityContent(content: string) {
  try {
    const parsed = JSON.parse(content);
    if (parsed.type === "activity_summary") {
      return parsed as {
        type: "activity_summary";
        title: string;
        activities: { icon: string; label: string; detail?: string }[];
      };
    }
  } catch {
    // Not JSON, return null
  }
  return null;
}

// Group reactions by emoji
function groupReactions(reactions: CommentData["reactions"], currentUserId: string): Reaction[] {
  if (!reactions || reactions.length === 0) return [];

  const grouped = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        hasReacted: false,
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.user);
    if (reaction.userId === currentUserId) {
      acc[reaction.emoji].hasReacted = true;
    }
    return acc;
  }, {} as Record<string, Reaction>);

  return Object.values(grouped);
}

// Activity Summary Component
function ActivitySummary({
  title,
  activities
}: {
  title: string;
  activities: { icon: string; label: string; detail?: string }[];
}) {
  // Filter out activities without labels
  const validActivities = activities.filter(a => a.label);

  if (validActivities.length === 0) {
    return (
      <div className="rounded-lg border bg-gradient-to-r from-primary/5 to-transparent p-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          </div>
          <span className="font-medium text-sm">{title}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-gradient-to-r from-primary/5 to-transparent p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        </div>
        <span className="font-medium text-sm">{title}</span>
      </div>
      <div className="space-y-2 pl-8">
        {validActivities.map((activity, index) => {
          const IconComponent = ACTIVITY_ICONS[activity.icon] || GitBranch;
          return (
            <div key={index} className="flex items-start gap-2 text-sm">
              <IconComponent className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-foreground">{activity.label}</span>
                {activity.detail && (
                  <span className="text-muted-foreground ml-1 font-mono text-xs">
                    {activity.detail}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Single Comment Component
function CommentItem({
  comment,
  currentUserId,
  onEdit,
  onDelete,
  onReact,
}: {
  comment: CommentData;
  currentUserId: string;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReact: (id: string, emoji: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isLoading, setIsLoading] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const isOwnComment = comment.userId === currentUserId;
  const wasEdited = comment.updatedAt ? new Date(comment.updatedAt) > new Date(comment.createdAt) : false;
  const groupedReactions = groupReactions(comment.reactions, currentUserId);

  // Check if this is an activity summary comment
  const activityContent = comment.type === "ACTIVITY" ? parseActivityContent(comment.content) : null;

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setIsLoading(true);
    try {
      await onEdit(comment.id, editContent);
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete(comment.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReaction = async (emoji: string) => {
    await onReact(comment.id, emoji);
    setShowReactionPicker(false);
  };

  // Render activity summary differently
  if (activityContent) {
    return (
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600">
            <Bot className="h-4 w-4 text-white" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-sm">FlowForge Agent</span>
            <Badge variant="ai" className="text-[10px]">AI</Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground cursor-help">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {format(new Date(comment.createdAt), "PPpp")}
              </TooltipContent>
            </Tooltip>
          </div>
          <ActivitySummary title={activityContent.title} activities={activityContent.activities} />

          {/* Reactions */}
          <div className="flex items-center gap-2 mt-2">
            {groupedReactions.map((reaction) => (
              <Tooltip key={reaction.emoji}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleReaction(reaction.emoji)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                      reaction.hasReacted
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/50 border-transparent hover:border-muted-foreground/30"
                    )}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {reaction.users.map(u => u.name).join(", ")}
                </TooltipContent>
              </Tooltip>
            ))}
            <Popover open={showReactionPicker} onOpenChange={setShowReactionPicker}>
              <PopoverTrigger asChild>
                <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                  <SmilePlus className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex gap-1">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className="p-1.5 rounded hover:bg-muted transition-colors text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    );
  }

  // Regular comment (user or system)
  return (
    <div className="flex gap-3 group">
      <Avatar className="h-8 w-8 shrink-0">
        {comment.user ? (
          <>
            <AvatarImage src={comment.user.image || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {comment.user.name?.charAt(0) || "U"}
            </AvatarFallback>
          </>
        ) : (
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600">
            <Bot className="h-4 w-4 text-white" />
          </AvatarFallback>
        )}
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {comment.isSystem ? "FlowForge Agent" : comment.user?.name || "Unknown"}
          </span>
          {comment.isSystem && <Badge variant="ai" className="text-[10px]">AI</Badge>}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground cursor-help">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                {wasEdited && " (edited)"}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {format(new Date(comment.createdAt), "PPpp")}
              {wasEdited && comment.updatedAt && (
                <div className="text-xs text-muted-foreground mt-1">
                  Edited {format(new Date(comment.updatedAt), "PPpp")}
                </div>
              )}
            </TooltipContent>
          </Tooltip>

          {/* Edit/Delete menu for own comments */}
          {isOwnComment && !comment.isSystem && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Comment content or edit mode */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[80px] p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSaveEdit} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm bg-muted/50 rounded-lg p-3">
            <CommentContent content={comment.content} />
          </div>
        )}

        {/* Reactions */}
        {!isEditing && (
          <div className="flex items-center gap-2 mt-2">
            {groupedReactions.map((reaction) => (
              <Tooltip key={reaction.emoji}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleReaction(reaction.emoji)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                      reaction.hasReacted
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/50 border-transparent hover:border-muted-foreground/30"
                    )}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {reaction.users.map(u => u.name).join(", ")}
                </TooltipContent>
              </Tooltip>
            ))}
            <Popover open={showReactionPicker} onOpenChange={setShowReactionPicker}>
              <PopoverTrigger asChild>
                <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all">
                  <SmilePlus className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex gap-1">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className="p-1.5 rounded hover:bg-muted transition-colors text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentsSection({
  taskId,
  projectId,
  comments,
  currentUserId,
}: CommentsSectionProps) {
  const router = useRouter();
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Filter out verbose system execution logs
  const filteredComments = comments.filter(comment => {
    if (!comment.isSystem) return true;

    // Always show activity summaries
    if (comment.type === "ACTIVITY") return true;

    // Filter out old verbose step-by-step comments
    const content = comment.content.toLowerCase();
    if (content.includes('starting execution') ||
        content.includes('generating code') ||
        content.includes('creating branch') ||
        content.includes('committing files') ||
        content.includes('requesting reviewers') ||
        content.startsWith('step completed:') ||
        content.startsWith('execution step:') ||
        content.includes('created branch `') ||
        content.includes('committed') ||
        content.includes('requested review from:') ||
        content.includes('created pull request [#') ||
        content.includes('reusing existing branch') ||
        content.includes('analyzed comment from') ||
        content.includes('replied to discussion comment from') ||
        content.includes('addressed code change request from') ||
        content.includes('no review comments to address')) {
      return false;
    }
    return true;
  });

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim()) return;
    setIsAddingComment(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      if (response.ok) {
        setNewComment("");
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add comment");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("An error occurred while adding the comment");
    } finally {
      setIsAddingComment(false);
    }
  }, [newComment, taskId, router]);

  const handleEditComment = useCallback(async (commentId: string, content: string) => {
    const response = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (response.ok) {
      router.refresh();
    } else {
      const error = await response.json();
      throw new Error(error.error || "Failed to edit comment");
    }
  }, [router]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    const response = await fetch(`/api/comments/${commentId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      router.refresh();
    } else {
      const error = await response.json();
      alert(error.error || "Failed to delete comment");
    }
  }, [router]);

  const handleReaction = useCallback(async (commentId: string, emoji: string) => {
    const response = await fetch(`/api/comments/${commentId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (response.ok) {
      router.refresh();
    }
  }, [router]);

  return (
    <div className="space-y-4">
      {filteredComments.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-muted/50 mb-3">
            <Bot className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No comments yet. Start the conversation!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
              onReact={handleReaction}
            />
          ))}
        </div>
      )}

      <Separator />

      {/* New comment input */}
      <div className="flex gap-3">
        <div className="flex-1">
          <MentionInput
            value={newComment}
            onChange={setNewComment}
            projectId={projectId}
            placeholder="Write a comment..."
            rows={2}
          />
        </div>
        <Button
          onClick={handleAddComment}
          disabled={isAddingComment || !newComment.trim()}
          size="icon"
          className="shrink-0 self-end h-10 w-10"
        >
          {isAddingComment ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
