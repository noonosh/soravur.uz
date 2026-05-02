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
import { Plus, Trash2 } from "lucide-react";
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
      <div className="space-y-2">
        <Skeleton className="h-9 w-full rounded-md" />
        <div className="space-y-1.5 pt-3">
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <Button
          onClick={onNewThread}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 h-9 border-dashed border-border/70 hover:border-border bg-transparent text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          <span className="text-sm font-medium">Yangi suhbat</span>
        </Button>

        {threads.length === 0 ? (
          <div className="text-center py-10 px-2">
            <p className="text-sm text-foreground font-medium">
              Hali suhbatlar yo&apos;q
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">
              Yangi suhbat yarating va savolingizni yozing.
            </p>
          </div>
        ) : (
          <ul className="-mx-2">
            {threads.map((thread) => {
              const isActive = selectedThreadId === thread._id;
              return (
                <li key={thread._id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onThreadSelect(thread._id)}
                    className={cn(
                      "w-full text-left rounded-md px-3 py-2.5 transition-colors",
                      "hover:bg-muted/60",
                      isActive && "bg-muted/80"
                    )}
                  >
                    {/* Active accent bar */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-brand transition-opacity",
                        isActive ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0 pr-6">
                        <p
                          className={cn(
                            "text-sm leading-snug truncate",
                            isActive ? "font-medium" : "font-normal"
                          )}
                        >
                          {thread.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 tracking-tight">
                          {formatDistanceToNow(new Date(thread.updatedAt), {
                            addSuffix: true,
                            locale: uz,
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label="Suhbatni arxivlash"
                    onClick={(e) => handleDeleteClick(e, thread._id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center size-7 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AlertDialog
        open={!!threadToDelete}
        onOpenChange={(open) => !open && setThreadToDelete(null)}
      >
        <AlertDialogContent className="border-border/70">
          <AlertDialogHeader>
            <AlertDialogTitle className="tracking-tight">
              Suhbatni o&apos;chirish
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bu suhbatni o&apos;chirishni xohlaysizmi? Bu amalni qaytarib
              bo&apos;lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              O&apos;chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
