"use client";

import { User, Bot } from "lucide-react";
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

  return (
    <div
      className={cn(
        "group flex gap-2 md:gap-3 py-4 md:py-6 px-3 md:px-4 hover:bg-muted/50 transition-colors",
        isUser && "bg-muted/30"
      )}
    >
      <div className="flex-shrink-0 pt-1">
        {isUser ? (
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary-foreground" />
          </div>
        ) : (
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Bot className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-hidden min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {isUser ? "Siz" : "Yordamchi"}
          </span>
          {!isUser && message.model && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {message.model.split("/")[1]?.split(":")[0] || "AI"}
            </span>
          )}
        </div>
        <div
          className={cn(
            "prose prose-sm max-w-none",
            "prose-p:leading-7 prose-p:mb-4",
            "prose-headings:mb-3 prose-headings:mt-5",
            "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
            "prose-strong:font-semibold",
            "prose-ul:my-4 prose-ol:my-4",
            "prose-li:my-1",
            "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
            "prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg",
            "dark:prose-invert",
            "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic",
            "[&_.math-display]:overflow-x-auto [&_.math-display]:py-4",
            "[&_.math-inline]:text-sm"
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              // Custom code block rendering
              code: ({ node, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || "");
                const isInline = !match;

                if (isInline) {
                  return (
                    <code
                      className="bg-muted px-1 py-0.5 rounded text-sm font-mono"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }

                return (
                  <div className="relative group my-4">
                    <pre className="bg-muted border rounded-lg p-4 overflow-x-auto">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                );
              },
              // Custom paragraph rendering
              p: ({ children }) => (
                <p className="mb-3 last:mb-0 leading-7">{children}</p>
              ),
              // Custom list rendering
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-1 my-4">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-1 my-4">
                  {children}
                </ol>
              ),
              // Custom heading rendering
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-base font-semibold mt-3 mb-2">
                  {children}
                </h4>
              ),
              // Custom blockquote
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 italic opacity-90">
                  {children}
                </blockquote>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
