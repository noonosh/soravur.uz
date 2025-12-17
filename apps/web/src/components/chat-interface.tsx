"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@soravur/backend/convex/_generated/api";
import { ChatThreadList } from "./chat-thread-list";
import { ChatMessage } from "./chat-message";
import { ChatComposer } from "./chat-composer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MessageCircle, Sparkles } from "lucide-react";
import type { Id } from "@soravur/backend/convex/_generated/dataModel";

interface ChatInterfaceProps {
  userId: Id<"users">;
}

export function ChatInterface({ userId }: ChatInterfaceProps) {
  const [selectedThreadId, setSelectedThreadId] =
    useState<Id<"threads"> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const threads = useQuery(api.threads.listThreads, { userId });
  const messages = useQuery(
    api.messages.listMessages,
    selectedThreadId ? { threadId: selectedThreadId } : "skip"
  );

  const createThread = useMutation(api.threads.createThread);
  const appendUserMessage = useMutation(api.messages.appendUserMessage);
  const generateReply = useAction(api.chat.generateAssistantReply);

  // Auto-select first thread or create new one
  useEffect(() => {
    if (threads && threads.length > 0 && !selectedThreadId) {
      setSelectedThreadId(threads[0]._id);
    }
  }, [threads, selectedThreadId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewThread = async () => {
    try {
      const threadId = await createThread({ userId });
      setSelectedThreadId(threadId);
      toast.success("Yangi suhbat yaratildi");
    } catch (error) {
      toast.error("Xatolik yuz berdi");
      console.error(error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedThreadId) {
      // Create new thread if none selected
      try {
        const threadId = await createThread({ userId });
        setSelectedThreadId(threadId);
        await sendMessageToThread(threadId, content);
      } catch (error) {
        toast.error("Xatolik yuz berdi");
        console.error(error);
      }
    } else {
      await sendMessageToThread(selectedThreadId, content);
    }
  };

  const sendMessageToThread = async (
    threadId: Id<"threads">,
    content: string
  ) => {
    setIsGenerating(true);
    try {
      // Append user message
      const userMessageId = await appendUserMessage({
        threadId,
        content,
      });

      // Generate assistant reply
      await generateReply({
        threadId,
        userMessageId,
      });
    } catch (error) {
      toast.error("Javob olishda xatolik yuz berdi");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Thread list sidebar */}
      <div className="w-80 border-r bg-muted/10 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Suhbatlar</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <ChatThreadList
            userId={userId}
            selectedThreadId={selectedThreadId || undefined}
            onThreadSelect={setSelectedThreadId}
            onNewThread={handleNewThread}
          />
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {!selectedThreadId ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="rounded-full bg-primary/10 p-6 mb-4">
                <MessageCircle className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Yangi suhbatni boshlang
              </h3>
              <p className="text-muted-foreground max-w-md">
                O'zbek tilida savolingizni yozing va men sizga imtihonlarga
                tayyorgarlik ko'rishda yordam beraman
              </p>
            </div>
          ) : !messages ? (
            <div className="space-y-4 p-8">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 p-6 mb-4">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Savolingizni yozing
              </h3>
              <p className="text-muted-foreground max-w-md">
                Men sizga matematika, fizika, kimyo va boshqa fanlardan yordam
                bera olaman. Qadamlab tushuntiraman.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {messages.map((message) => (
                <ChatMessage key={message._id} message={message} />
              ))}
              {isGenerating && (
                <div className="flex gap-3 py-6 px-4 bg-muted/30 animate-pulse">
                  <div className="flex-shrink-0 pt-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Yordamchi</span>
                      <span className="text-xs text-muted-foreground">
                        javob yozmoqda...
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[80%]" />
                      <Skeleton className="h-4 w-[60%]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t bg-muted/5 p-4">
          <div className="max-w-3xl mx-auto">
            <ChatComposer onSend={handleSendMessage} isLoading={isGenerating} />
          </div>
        </div>
      </div>
    </div>
  );
}
