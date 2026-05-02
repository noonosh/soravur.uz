"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatComposer({
  onSend,
  isLoading = false,
  placeholder = "Savolingizni o'zbek tilida yozing…",
}: ChatComposerProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSend = message.trim().length > 0 && !isLoading;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-xl border border-border/70 bg-background transition-colors",
        focused && "border-foreground/30",
        "shadow-[0_1px_0_0_rgba(0,0,0,0.02)]"
      )}
    >
      <div className="flex gap-2 items-end px-3 pt-2.5 pb-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 min-h-[24px] max-h-[200px] bg-transparent text-[15px] resize-none outline-none placeholder:text-muted-foreground disabled:opacity-50 py-1 leading-6"
          rows={1}
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Yuborish"
          className={cn(
            "grid place-items-center size-8 rounded-md transition-all",
            canSend
              ? "bg-foreground text-background hover:opacity-90 active:translate-y-[1px]"
              : "bg-muted text-muted-foreground/60"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          ) : (
            <ArrowUp className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
      </div>
      <div className="flex items-center justify-between px-3 pb-2 text-[10px] text-muted-foreground/80 tracking-tight">
        <span className="hidden sm:inline">
          O&apos;zbekcha yozing — javob ham o&apos;zbekcha bo&apos;ladi.
        </span>
        <span className="font-mono ml-auto">
          <kbd className="px-1 py-0.5 rounded border border-border/70 bg-muted/40">
            Enter
          </kbd>{" "}
          yuborish ·{" "}
          <kbd className="px-1 py-0.5 rounded border border-border/70 bg-muted/40">
            Shift+Enter
          </kbd>{" "}
          yangi qator
        </span>
      </div>
    </form>
  );
}
