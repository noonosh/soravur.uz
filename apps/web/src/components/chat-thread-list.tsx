"use client";

import { useQuery } from "convex/react";
import { api } from "@soravur/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquarePlus, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
    <div className="space-y-3">
      <Button
        onClick={onNewThread}
        className="w-full justify-start gap-2 h-10 touch-manipulation"
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
                "w-full text-left rounded-lg p-3 transition-all hover:bg-muted/50 touch-manipulation active:scale-[0.98]",
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
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
