"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@soravur/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { MessageSquarePlus, MessageCircle, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Id } from "@soravur/backend/convex/_generated/dataModel";

interface ChatThreadListProps {
  userId: Id<"users">;
  selectedThreadId?: Id<"threads">;
  onThreadSelect: (threadId: Id<"threads">) => void;
  onNewThread: () => void;
}

export function ChatThreadList({
  userId,
  selectedThreadId,
  onThreadSelect,
  onNewThread,
}: ChatThreadListProps) {
  const threads = useQuery(api.threads.listThreads, { userId });
  const archiveThread = useMutation(api.threads.archiveThread);
  const [threadToDelete, setThreadToDelete] = useState<Id<"threads"> | null>(
    null
  );

  const handleDeleteClick = (e: React.MouseEvent, threadId: Id<"threads">) => {
    e.stopPropagation();
    setThreadToDelete(threadId);
  };

  const handleConfirmDelete = async () => {
    if (!threadToDelete || !threads) return;

    try {
      await archiveThread({ threadId: threadToDelete });
      toast.success("Suhbat o'chirildi");

      // If the deleted thread was selected, switch to closest available thread
      if (selectedThreadId === threadToDelete) {
        const deletedIndex = threads.findIndex((t) => t._id === threadToDelete);

        if (deletedIndex !== -1) {
          // Try to select the next thread (one after deleted)
          if (deletedIndex + 1 < threads.length) {
            onThreadSelect(threads[deletedIndex + 1]._id);
          }
          // Otherwise, try to select the previous thread
          else if (deletedIndex > 0) {
            onThreadSelect(threads[deletedIndex - 1]._id);
          }
          // No threads left, create new one
          else {
            onNewThread();
          }
        } else {
          // Fallback: create new thread if we can't find the deleted one
          onNewThread();
        }
      }
    } catch (error) {
      toast.error("Xatolik yuz berdi");
      console.error(error);
    } finally {
      setThreadToDelete(null);
    }
  };

  if (!threads) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <Button
          onClick={onNewThread}
          className="w-full justify-start gap-2 h-10 touch-manipulation cursor-pointer"
          variant="ghost"
          size="sm"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span>Yangi suhbat</span>
        </Button>

        <div className="space-y-1">
          {threads.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Hali suhbatlar yo'q
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread._id}
                className={cn(
                  "group w-full text-left rounded-lg p-3 transition-all hover:bg-muted/50 touch-manipulation active:scale-[0.98] relative cursor-pointer",
                  selectedThreadId === thread._id &&
                    "bg-muted shadow-sm border border-border"
                )}
                onClick={() => onThreadSelect(thread._id)}
              >
                <div className="flex items-start gap-2.5">
                  <MessageCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">
                      {thread.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(thread.updatedAt), {
                        addSuffix: true,
                        locale: uz,
                      })}
                    </p>
                  </div>
                  <div
                    onClick={(e) => handleDeleteClick(e, thread._id)}
                    className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 hover:bg-destructive/20 hover:scale-110 rounded cursor-pointer active:scale-95"
                    aria-label="Archive chat"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleDeleteClick(e as any, thread._id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <AlertDialog
        open={!!threadToDelete}
        onOpenChange={(open) => !open && setThreadToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suhbatni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Bu suhbatni o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer hover:scale-105 active:scale-95 transition-transform">
              Bekor qilish
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
