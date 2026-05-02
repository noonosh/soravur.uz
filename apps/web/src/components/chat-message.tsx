"use client";

import type { Doc } from "@soravur/backend/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface ChatMessageProps {
  message: Doc<"messages">;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const modelLabel = !isUser
    ? message.model?.split("/")[1]?.split(":")[0] ?? "Soravur"
    : null;

  return (
    <article
      className={cn(
        "group flex gap-3 md:gap-4 py-5 md:py-7 px-4 md:px-8 transition-colors"
      )}
    >
      {/* Avatar — neutral. User: outlined ring. Assistant: filled disc. */}
      <div className="flex-shrink-0 pt-1">
        {isUser ? (
          <div
            aria-hidden
            className="size-7 rounded-full bg-background border border-border/70 grid place-items-center text-[10px] font-medium tracking-tight text-muted-foreground"
          >
            S
          </div>
        ) : (
          <div
            aria-hidden
            className="size-7 rounded-full bg-foreground text-background grid place-items-center"
          >
            <span
              className="block size-1.5 rounded-full bg-background"
              aria-hidden
            />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-hidden min-w-0">
        <div className="flex items-baseline gap-2 leading-none">
          <span className="text-xs font-medium tracking-tight text-foreground">
            {isUser ? "Siz" : "Yordamchi"}
          </span>
          {modelLabel && (
            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 font-mono">
              {modelLabel}
            </span>
          )}
        </div>

        {message.content.length === 0 && !isUser ? (
          // Streaming placeholder before first delta lands.
          <div
            className="flex items-center gap-1.5 pt-1"
            aria-label="Yordamchi javob yozmoqda"
          >
            <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
            <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:120ms]" />
            <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:240ms]" />
          </div>
        ) : (
          <div
            className={cn(
              "prose prose-sm max-w-none",
              "prose-p:leading-7 prose-p:my-3",
              "prose-headings:mt-5 prose-headings:mb-2 prose-headings:tracking-tight prose-headings:font-medium",
              "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
              "prose-strong:font-medium prose-strong:text-foreground",
              "prose-ul:my-3 prose-ol:my-3 prose-li:my-1",
              "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.85em] prose-code:font-mono",
              "prose-pre:bg-muted prose-pre:border prose-pre:border-border/70 prose-pre:rounded-md prose-pre:p-4",
              "prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground",
              "dark:prose-invert",
              "[&_.math-display]:overflow-x-auto [&_.math-display]:py-2",
              "[&_.math-inline]:text-[0.95em]"
            )}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline = !match;
                  if (isInline) {
                    return (
                      <code
                        className="bg-muted px-1.5 py-0.5 rounded text-[0.85em] font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <pre className="bg-muted border border-border/70 rounded-md p-4 overflow-x-auto my-4">
                      <code className={cn(className, "font-mono")} {...props}>
                        {children}
                      </code>
                    </pre>
                  );
                },
                p: ({ children }) => (
                  <p className="leading-7 my-3 first:mt-0 last:mb-0">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 my-3 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 my-3 space-y-1">
                    {children}
                  </ol>
                ),
                h1: ({ children }) => (
                  <h1 className="text-xl font-medium tracking-tight mt-5 mb-2">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-medium tracking-tight mt-5 mb-2">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-medium tracking-tight mt-4 mb-2">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-sm font-medium tracking-tight mt-3 mb-1.5">
                    {children}
                  </h4>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-border pl-4 my-4 italic text-muted-foreground">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </article>
  );
}
