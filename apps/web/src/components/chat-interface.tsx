"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@soravur/backend/convex/_generated/api";
import { ChatThreadList } from "./chat-thread-list";
import { ChatMessage } from "./chat-message";
import { ChatComposer } from "./chat-composer";
import {
  ModelSelector,
  getModelByType,
  type ModelType,
} from "./model-selector";
import { Button } from "./ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MessageCircle, Sparkles, Menu, X } from "lucide-react";
import type { Id } from "@soravur/backend/convex/_generated/dataModel";

interface ChatInterfaceProps {
  userId: Id<"users">;
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

export function ChatInterface({
  userId,
  selectedModel,
  onModelChange,
}: ChatInterfaceProps) {
  const [selectedThreadId, setSelectedThreadId] =
    useState<Id<"threads"> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      setSidebarOpen(false); // Close sidebar on mobile
      toast.success("Yangi suhbat yaratildi");
    } catch (error) {
      toast.error("Xatolik yuz berdi");
      console.error(error);
    }
  };

  const handleThreadSelect = (threadId: Id<"threads">) => {
    setSelectedThreadId(threadId);
    setSidebarOpen(false); // Close sidebar on mobile
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

      // Generate assistant reply with selected model
      await generateReply({
        threadId,
        userMessageId,
        model: getModelByType(selectedModel),
      });
    } catch (error) {
      toast.error("Javob olishda xatolik yuz berdi");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Thread list sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-80 border-r bg-background flex flex-col flex-shrink-0
          transform transition-transform duration-300 ease-in-out
          ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Suhbatlar</h2>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <ChatThreadList
            userId={userId}
            selectedThreadId={selectedThreadId || undefined}
            onThreadSelect={handleThreadSelect}
            onNewThread={handleNewThread}
          />
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        {/* Mobile header with hamburger and model selector */}
        <div className="md:hidden border-b bg-background px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={onModelChange}
            />
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {!selectedThreadId ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 md:p-8">
              <div className="rounded-full bg-primary/10 p-4 md:p-6 mb-3 md:mb-4">
                <MessageCircle className="h-10 w-10 md:h-12 md:w-12 text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2">
                Yangi suhbatni boshlang
              </h3>
              <p className="text-sm md:text-base text-muted-foreground max-w-md px-4">
                O'zbek tilida savolingizni yozing va men sizga imtihonlarga
                tayyorgarlik ko'rishda yordam beraman
              </p>
            </div>
          ) : !messages ? (
            <div className="space-y-4 p-4 md:p-8">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 md:p-8">
              <div className="rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 p-4 md:p-6 mb-3 md:mb-4">
                <Sparkles className="h-10 w-10 md:h-12 md:w-12 text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2">
                Savolingizni yozing
              </h3>
              <p className="text-sm md:text-base text-muted-foreground max-w-md px-4">
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
                <div className="flex gap-2 md:gap-3 py-4 md:py-6 px-3 md:px-4 bg-muted/30 animate-pulse">
                  <div className="flex-shrink-0 pt-1">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <div className="h-3.5 w-3.5 md:h-4 md:w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
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
        <div className="border-t bg-muted/5 p-3 md:p-4">
          <div className="max-w-3xl mx-auto">
            <ChatComposer onSend={handleSendMessage} isLoading={isGenerating} />
          </div>
        </div>
      </div>
    </div>
  );
}
