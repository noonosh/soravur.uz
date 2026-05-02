"use client";

import { useEffect, useState } from "react";
import { useThreads, type ThreadsView } from "@/lib/use-threads";
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
import { Plus, Trash2, RotateCcw } from "lucide-react";
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

const TABS: Array<{ value: ThreadsView; label: string }> = [
  { value: "active", label: "Faol" },
  { value: "archived", label: "Arxiv" },
];

export function ChatThreadList({
  userId,
  selectedThreadId,
  onThreadSelect,
  onNewThread,
}: ChatThreadListProps) {
  const [view, setView] = useState<ThreadsView>("active");
  const { threads, archive, unarchive } = useThreads(userId, view);
  const [threadToArchive, setThreadToArchive] = useState<Id<"threads"> | null>(
    null
  );

  // Auto-select the most recent active thread on first load. Skip when
  // the user is browsing archived threads — archive view shouldn't pull
  // selection away from whatever the user was just looking at.
  useEffect(() => {
    if (
      view === "active" &&
      threads &&
      threads.length > 0 &&
      !selectedThreadId
    ) {
      onThreadSelect(threads[0]._id);
    }
  }, [view, threads, selectedThreadId, onThreadSelect]);

  const handleArchiveClick = (
    e: React.MouseEvent,
    threadId: Id<"threads">
  ) => {
    e.stopPropagation();
    setThreadToArchive(threadId);
  };

  const handleConfirmArchive = async () => {
    if (!threadToArchive || !threads) return;
    try {
      await archive(threadToArchive);
      toast.success("Suhbat arxivlandi");
      if (selectedThreadId === threadToArchive) {
        const idx = threads.findIndex((t) => t._id === threadToArchive);
        if (idx !== -1) {
          if (idx + 1 < threads.length) {
            onThreadSelect(threads[idx + 1]._id);
          } else if (idx > 0) {
            onThreadSelect(threads[idx - 1]._id);
          } else {
            onNewThread();
          }
        }
      }
    } catch {
      toast.error("Xatolik yuz berdi");
    } finally {
      setThreadToArchive(null);
    }
  };

  const handleRestore = async (
    e: React.MouseEvent,
    threadId: Id<"threads">
  ) => {
    e.stopPropagation();
    try {
      await unarchive(threadId);
      toast.success("Suhbat tiklandi");
    } catch {
      toast.error("Tiklashda xatolik");
    }
  };

  return (
    <>
      <div className="space-y-3">
        {/* View tabs */}
        <div
          role="tablist"
          aria-label="Suhbatlar ko'rinishi"
          className="grid grid-cols-2 p-0.5 rounded-md bg-muted/50 text-sm"
        >
          {TABS.map((tab) => {
            const active = view === tab.value;
            return (
              <button
                key={tab.value}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setView(tab.value)}
                className={cn(
                  "h-8 rounded-sm transition-colors text-xs font-medium tracking-tight",
                  active
                    ? "bg-background text-foreground shadow-[0_1px_0_0_rgba(0,0,0,0.04)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {view === "active" && (
          <Button
            onClick={onNewThread}
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 h-9 border-dashed border-border/70 hover:border-border bg-transparent text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-sm font-medium">Yangi suhbat</span>
          </Button>
        )}

        {!threads ? (
          <div className="space-y-1.5 pt-1">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        ) : threads.length === 0 ? (
          <EmptyState view={view} />
        ) : (
          <ul className="-mx-2">
            {threads.map((thread) => {
              const isActive = selectedThreadId === thread._id;
              const isArchived = view === "archived";
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
                  {isArchived ? (
                    <button
                      type="button"
                      aria-label="Suhbatni tiklash"
                      onClick={(e) => handleRestore(e, thread._id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center size-7 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-muted focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-opacity"
                    >
                      <RotateCcw
                        className="h-3.5 w-3.5"
                        strokeWidth={1.5}
                      />
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label="Suhbatni arxivlash"
                      onClick={(e) => handleArchiveClick(e, thread._id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center size-7 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AlertDialog
        open={!!threadToArchive}
        onOpenChange={(open) => !open && setThreadToArchive(null)}
      >
        <AlertDialogContent className="border-border/70">
          <AlertDialogHeader>
            <AlertDialogTitle className="tracking-tight">
              Suhbatni arxivlash
            </AlertDialogTitle>
            <AlertDialogDescription>
              Suhbat arxivga ko&apos;chiriladi. Istalgan vaqtda
              &quot;Arxiv&quot; tabidan tiklab olishingiz mumkin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmArchive}
              className="bg-foreground text-background hover:opacity-90"
            >
              Arxivlash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EmptyState({ view }: { view: ThreadsView }) {
  if (view === "archived") {
    return (
      <div className="text-center py-10 px-2">
        <p className="text-sm text-foreground font-medium">
          Arxivda hech narsa yo&apos;q
        </p>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Suhbatlarni arxivlasangiz, ular shu yerda paydo bo&apos;ladi.
        </p>
      </div>
    );
  }
  return (
    <div className="text-center py-10 px-2">
      <p className="text-sm text-foreground font-medium">
        Hali suhbatlar yo&apos;q
      </p>
      <p className="text-xs text-muted-foreground mt-1.5">
        Yangi suhbat yarating va savolingizni yozing.
      </p>
    </div>
  );
}
