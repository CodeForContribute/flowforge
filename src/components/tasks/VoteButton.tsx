"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThumbsUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoteButtonProps {
  taskId: string;
  initialVoteCount?: number;
  initialHasVoted?: boolean;
  size?: "sm" | "default";
  showCount?: boolean;
}

export function VoteButton({
  taskId,
  initialVoteCount = 0,
  initialHasVoted = false,
  size = "default",
  showCount = true,
}: VoteButtonProps) {
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    async function fetchVoteStatus() {
      try {
        const response = await fetch(`/api/tasks/${taskId}/votes`);
        if (response.ok) {
          const data = await response.json();
          setVoteCount(data.voteCount);
          setHasVoted(data.hasVoted);
        }
      } catch (error) {
        console.error("Error fetching vote status:", error);
      } finally {
        setIsFetching(false);
      }
    }
    fetchVoteStatus();
  }, [taskId]);

  async function handleVote() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/votes`, {
        method: hasVoted ? "DELETE" : "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setVoteCount(data.voteCount);
        setHasVoted(data.hasVoted);
      } else {
        const error = await response.json();
        console.error("Vote error:", error);
      }
    } catch (error) {
      console.error("Error toggling vote:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const isSmall = size === "sm";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={hasVoted ? "default" : "outline"}
          size={isSmall ? "sm" : "default"}
          className={cn(
            "gap-1.5 transition-all",
            hasVoted && "bg-primary hover:bg-primary/90",
            isSmall && "h-8 px-2"
          )}
          onClick={handleVote}
          disabled={isLoading || isFetching}
        >
          {isLoading ? (
            <Loader2 className={cn("animate-spin", isSmall ? "h-3.5 w-3.5" : "h-4 w-4")} />
          ) : (
            <ThumbsUp
              className={cn(
                isSmall ? "h-3.5 w-3.5" : "h-4 w-4",
                hasVoted && "fill-current"
              )}
            />
          )}
          {showCount && (
            <span className={cn("font-semibold", isSmall && "text-xs")}>
              {isFetching ? "-" : voteCount}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{hasVoted ? "Remove vote" : "Vote for this task"}</p>
        {voteCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {voteCount} {voteCount === 1 ? "vote" : "votes"}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
