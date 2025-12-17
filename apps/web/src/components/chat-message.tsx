"use client";

import { User, Bot } from "lucide-react";
import type { Doc } from "@soravur/backend/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Doc<"messages">;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "group flex gap-3 py-6 px-4 hover:bg-muted/50 transition-colors",
        isUser && "bg-muted/30"
      )}
    >
      <div className="flex-shrink-0 pt-1">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Bot className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {isUser ? "Siz" : "Yordamchi"}
          </span>
          {!isUser && message.model && (
            <span className="text-xs text-muted-foreground">
              {message.model.split("/")[1]?.split(":")[0] || "AI"}
            </span>
          )}
        </div>
        <div
          className={cn(
            "prose prose-sm max-w-none",
            "prose-p:leading-7",
            "prose-pre:bg-muted prose-pre:border",
            "dark:prose-invert"
          )}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
}
