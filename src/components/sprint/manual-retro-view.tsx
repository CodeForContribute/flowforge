"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ThumbsUp,
  ThumbsDown,
  Plus,
  Loader2,
  Smile,
  Frown,
  Lightbulb,
  CheckCircle2,
  Trash2,
  Edit2,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface RetroItem {
  id: string;
  content: string;
  type: "WENT_WELL" | "TO_IMPROVE" | "ACTION_ITEM";
  votes: number;
  completed: boolean;
  createdAt: string;
  author: Author;
}

interface ManualRetroViewProps {
  sprintId: string;
  sprintName: string;
}

export function ManualRetroView({
  sprintId,
  sprintName,
}: ManualRetroViewProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || "";
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [wentWell, setWentWell] = useState<RetroItem[]>([]);
  const [toImprove, setToImprove] = useState<RetroItem[]>([]);
  const [actionItems, setActionItems] = useState<RetroItem[]>([]);

  // New item states
  const [newWentWell, setNewWentWell] = useState("");
  const [newToImprove, setNewToImprove] = useState("");
  const [newActionItem, setNewActionItem] = useState("");

  // Edit states
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (open) {
      fetchItems();
    }
  }, [open, sprintId]);

  async function fetchItems() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sprints/${sprintId}/retro/items`);
      if (response.ok) {
        const data = await response.json();
        setWentWell(data.wentWell);
        setToImprove(data.toImprove);
        setActionItems(data.actionItems);
      }
    } catch (error) {
      console.error("Error fetching retro items:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddItem(type: "WENT_WELL" | "TO_IMPROVE" | "ACTION_ITEM", content: string) {
    if (!content.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/sprints/${sprintId}/retro/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content }),
      });

      if (response.ok) {
        const item = await response.json();
        if (type === "WENT_WELL") {
          setWentWell([...wentWell, item]);
          setNewWentWell("");
        } else if (type === "TO_IMPROVE") {
          setToImprove([...toImprove, item]);
          setNewToImprove("");
        } else {
          setActionItems([...actionItems, item]);
          setNewActionItem("");
        }
      }
    } catch (error) {
      console.error("Error adding item:", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleVote(itemId: string, action: "upvote" | "downvote") {
    try {
      const response = await fetch(`/api/sprints/${sprintId}/retro/items/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        updateItemInState(updatedItem);
      }
    } catch (error) {
      console.error("Error voting:", error);
    }
  }

  async function handleToggleComplete(itemId: string, completed: boolean) {
    try {
      const response = await fetch(`/api/sprints/${sprintId}/retro/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        updateItemInState(updatedItem);
      }
    } catch (error) {
      console.error("Error updating item:", error);
    }
  }

  async function handleUpdateItem(itemId: string) {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/sprints/${sprintId}/retro/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        updateItemInState(updatedItem);
        setEditingItem(null);
        setEditContent("");
      }
    } catch (error) {
      console.error("Error updating item:", error);
    }
  }

  async function handleDeleteItem(itemId: string, type: string) {
    try {
      const response = await fetch(`/api/sprints/${sprintId}/retro/items/${itemId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        if (type === "WENT_WELL") {
          setWentWell(wentWell.filter((i) => i.id !== itemId));
        } else if (type === "TO_IMPROVE") {
          setToImprove(toImprove.filter((i) => i.id !== itemId));
        } else {
          setActionItems(actionItems.filter((i) => i.id !== itemId));
        }
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  }

  function updateItemInState(item: RetroItem) {
    if (item.type === "WENT_WELL") {
      setWentWell(wentWell.map((i) => (i.id === item.id ? item : i)));
    } else if (item.type === "TO_IMPROVE") {
      setToImprove(toImprove.map((i) => (i.id === item.id ? item : i)));
    } else {
      setActionItems(actionItems.map((i) => (i.id === item.id ? item : i)));
    }
  }

  function startEdit(item: RetroItem) {
    setEditingItem(item.id);
    setEditContent(item.content);
  }

  function renderItem(item: RetroItem, showCheckbox = false) {
    const isEditing = editingItem === item.id;
    const isAuthor = item.author.id === currentUserId;

    return (
      <div
        key={item.id}
        className={cn(
          "p-3 rounded-lg border bg-card transition-all",
          item.completed && "opacity-60"
        )}
      >
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleUpdateItem(item.id)}>
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingItem(null);
                  setEditContent("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              {showCheckbox && (
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={(checked) =>
                    handleToggleComplete(item.id, checked as boolean)
                  }
                  className="mt-1"
                />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm",
                    item.completed && "line-through text-muted-foreground"
                  )}
                >
                  {item.content}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={item.author.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {item.author.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {item.author.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleVote(item.id, "upvote")}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
                <Badge variant="secondary" className="text-xs px-1.5">
                  {item.votes}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleVote(item.id, "downvote")}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {isAuthor && (
              <div className="flex gap-1 mt-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => startEdit(item)}
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Item</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this retro item?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteItem(item.id, item.type)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ClipboardList className="h-4 w-4" />
          Team Retro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-white" />
            </div>
            Sprint Retrospective
          </DialogTitle>
          <DialogDescription>
            Team retrospective notes for &quot;{sprintName}&quot;
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 overflow-auto max-h-[70vh] pb-4">
            {/* Went Well Column */}
            <Card className="bg-green-500/5 border-green-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-green-600">
                  <Smile className="h-5 w-5" />
                  What Went Well
                  <Badge variant="secondary" className="ml-auto">
                    {wentWell.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add something that went well..."
                    value={newWentWell}
                    onChange={(e) => setNewWentWell(e.target.value)}
                    className="min-h-[60px] bg-background"
                  />
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => handleAddItem("WENT_WELL", newWentWell)}
                    disabled={!newWentWell.trim() || isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-auto">
                  {wentWell.map((item) => renderItem(item))}
                </div>
              </CardContent>
            </Card>

            {/* To Improve Column */}
            <Card className="bg-orange-500/5 border-orange-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                  <Frown className="h-5 w-5" />
                  What to Improve
                  <Badge variant="secondary" className="ml-auto">
                    {toImprove.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add something to improve..."
                    value={newToImprove}
                    onChange={(e) => setNewToImprove(e.target.value)}
                    className="min-h-[60px] bg-background"
                  />
                  <Button
                    size="sm"
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    onClick={() => handleAddItem("TO_IMPROVE", newToImprove)}
                    disabled={!newToImprove.trim() || isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-auto">
                  {toImprove.map((item) => renderItem(item))}
                </div>
              </CardContent>
            </Card>

            {/* Action Items Column */}
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-600">
                  <Lightbulb className="h-5 w-5" />
                  Action Items
                  <Badge variant="secondary" className="ml-auto">
                    {actionItems.filter((i) => !i.completed).length}/
                    {actionItems.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add an action item..."
                    value={newActionItem}
                    onChange={(e) => setNewActionItem(e.target.value)}
                    className="min-h-[60px] bg-background"
                  />
                  <Button
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleAddItem("ACTION_ITEM", newActionItem)}
                    disabled={!newActionItem.trim() || isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-auto">
                  {actionItems.map((item) => renderItem(item, true))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Summary footer */}
        {!isLoading && (
          <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {wentWell.length} wins
              </span>
              <span className="flex items-center gap-1">
                <Frown className="h-4 w-4 text-orange-500" />
                {toImprove.length} improvements
              </span>
              <span className="flex items-center gap-1">
                <Lightbulb className="h-4 w-4 text-blue-500" />
                {actionItems.filter((i) => !i.completed).length} open actions
              </span>
            </div>
            <span>
              {wentWell.length + toImprove.length + actionItems.length} total items
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
