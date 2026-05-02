"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "convex/react";
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
import { Menu, X } from "lucide-react";
import type { Doc, Id } from "@soravur/backend/convex/_generated/dataModel";

interface ChatInterfaceProps {
  userId: Id<"users">;
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

async function getConvexAuthToken(): Promise<string> {
  const res = await fetch("/api/convex-token", { method: "GET" });
  if (!res.ok) {
    throw new Error("Auth token olishda xatolik yuz berdi");
  }
  const data = (await res.json()) as { token: string | null };
  if (!data.token) {
    throw new Error("Avtorizatsiya talab qilinadi");
  }
  return data.token;
}

// Three subject pools. The empty-state suggester picks one prompt from
// each pool and shuffles their display order, so the user always sees
// variety AND every subject is represented. Each suggestion carries
// its own subject tag so clicking auto-switches the model — picking a
// literature prompt while the maths model is selected would otherwise
// route the question to the wrong specialist.
const PROMPT_POOLS: Record<ModelType, string[]> = {
  maths: [
    "Kvadrat tenglamani qanday yechish mumkin?",
    "Trigonometriyada sinus va kosinus orasidagi farq nimada?",
    "Logarifmlarning asosiy xossalarini tushuntiring.",
    "Hosila va integralning ma’nosi nimada?",
    "Matritsalar nima va qayerda ishlatiladi?",
    "Ehtimollar nazariyasining asosiy tushunchalari qanday?",
    "Geometriyada Pifagor teoremasi qanday isbotlanadi?",
    "Progressiyalarning umumiy formulalarini ko‘rsating.",
  ],
  literature: [
    "Cho‘lpon she’riyatining asosiy mavzulari nimalardan iborat?",
    "Alisher Navoiy ijodida insonparvarlik g‘oyasi qanday namoyon bo‘lgan?",
    "Abdulla Qodiriyning “O‘tkan kunlar” romani nima haqida?",
    "Zulfiya she’rlarining o‘ziga xos jihatlari qanday?",
    "Hamid Olimjon ijodida vatan mavzusi qanday yoritilgan?",
    "G‘afur G‘ulom ijodining badiiy xususiyatlari qanday?",
    "Erkin Vohidov she’riyatida qaysi mavzular yetakchi?",
    "Oybekning “Qutlug‘ qon” romani qaysi davrni aks ettiradi?",
  ],
  programming: [
    "JavaScript’da Promise nima va qanday ishlaydi?",
    "React’da useState va useEffect orasidagi farq nimada?",
    "Big O notatsiyasi nima va nega muhim?",
    "REST API va GraphQL orasidagi farqlar qaysilar?",
    "TypeScript’ning JavaScript’dan afzalligi nimada?",
    "Git’da rebase va merge orasidagi farq nimada?",
    "SQL’da JOIN turlari qanday ishlaydi?",
    "Rekursiya nima va qachon ishlatiladi?",
  ],
};

function pickStarterPrompts(): Array<{ prompt: string; subject: ModelType }> {
  const subjects = Object.keys(PROMPT_POOLS) as ModelType[];
  const items = subjects.map((subject) => {
    const pool = PROMPT_POOLS[subject];
    const prompt = pool[Math.floor(Math.random() * pool.length)];
    return { prompt, subject };
  });
  // Fisher–Yates shuffle so subject order is also randomized.
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
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

  // Thread fetching is fully owned by ChatThreadList via the
  // useThreads hook now (includes auto-select-first behaviour).
  const messages = useQuery(
    api.messages.listMessages,
    selectedThreadId ? { threadId: selectedThreadId } : "skip"
  ) as Array<Doc<"messages">> | undefined;

  const convexSiteUrl = useMemo(() => {
    const cloudUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!cloudUrl) return "";
    if (cloudUrl.includes(".convex.cloud")) {
      return cloudUrl.replace(".convex.cloud", ".convex.site");
    }
    return cloudUrl;
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewThread = async () => {
    try {
      if (!convexSiteUrl) {
        throw new Error("NEXT_PUBLIC_CONVEX_URL sozlanmagan");
      }
      const token = await getConvexAuthToken();
      const res = await fetch(`${convexSiteUrl}/api/threads`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Xatolik yuz berdi");
      }
      const data = (await res.json()) as { threadId: Id<"threads"> };
      const threadId = data.threadId;
      setSelectedThreadId(threadId);
      setSidebarOpen(false); // Close sidebar on mobile
      toast.success("Yangi suhbat yaratildi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xatolik yuz berdi");
      console.error(error);
    }
  };

  const handleThreadSelect = (threadId: Id<"threads">) => {
    setSelectedThreadId(threadId);
    setSidebarOpen(false); // Close sidebar on mobile
  };

  const handleSendMessage = async (
    content: string,
    subjectOverride?: ModelType
  ) => {
    // If a starter prompt was clicked, switch the model BEFORE sending so
    // the dropdown reflects reality on the next render. The send call
    // itself takes the override directly because the parent's selectedModel
    // prop is still the previous value within this closure.
    if (subjectOverride && subjectOverride !== selectedModel) {
      onModelChange(subjectOverride);
    }
    const modelForCall = subjectOverride ?? selectedModel;

    if (!selectedThreadId) {
      // Create new thread if none selected
      try {
        if (!convexSiteUrl) {
          throw new Error("NEXT_PUBLIC_CONVEX_URL sozlanmagan");
        }
        const token = await getConvexAuthToken();
        const res = await fetch(`${convexSiteUrl}/api/threads`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Xatolik yuz berdi");
        }
        const data = (await res.json()) as { threadId: Id<"threads"> };
        const threadId = data.threadId;
        setSelectedThreadId(threadId);
        await sendMessageToThread(threadId, content, modelForCall);
      } catch (error) {
        toast.error("Xatolik yuz berdi");
        console.error(error);
      }
    } else {
      await sendMessageToThread(selectedThreadId, content, modelForCall);
    }
  };

  const sendMessageToThread = async (
    threadId: Id<"threads">,
    content: string,
    model: ModelType
  ) => {
    setIsGenerating(true);
    try {
      if (!convexSiteUrl) {
        throw new Error("NEXT_PUBLIC_CONVEX_URL sozlanmagan");
      }
      const token = await getConvexAuthToken();
      const res = await fetch(
        `${convexSiteUrl}/api/threads/${threadId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            model: getModelByType(model),
          }),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Javob olishda xatolik yuz berdi");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Javob olishda xatolik yuz berdi"
      );
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
          className="fixed inset-0 bg-foreground/40 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Thread list sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 border-r border-border/70 bg-background flex flex-col flex-shrink-0
          transform transition-transform duration-200 ease-out
          ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        <div className="px-4 h-14 border-b border-border/70 flex items-center justify-between flex-shrink-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Suhbatlar
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(false)}
            aria-label="Yopish"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          <ChatThreadList
            userId={userId}
            selectedThreadId={selectedThreadId || undefined}
            onThreadSelect={handleThreadSelect}
            onNewThread={handleNewThread}
          />
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        {/* Mobile header with hamburger and model selector */}
        <div className="md:hidden border-b border-border/70 bg-background px-3 h-14 flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setSidebarOpen(true)}
            aria-label="Suhbatlar"
          >
            <Menu className="h-4 w-4" strokeWidth={1.5} />
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
            <EmptyShell
              kicker="Boshlash"
              title="Yangi suhbatni boshlang."
              body="O‘zbek tilida savolingizni yozing — matematika, adabiyot va dasturlash bo‘yicha qadamma-qadam tushuntirib beraman."
            />
          ) : !messages ? (
            <div className="max-w-3xl mx-auto space-y-6 px-4 py-8 md:px-8">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-32 w-full rounded-md" />
            </div>
          ) : messages.length === 0 ? (
            <StarterPrompts
              isGenerating={isGenerating}
              onPick={handleSendMessage}
              threadId={selectedThreadId}
            />
          ) : (
            <div className="max-w-3xl mx-auto divide-y divide-border/60">
              {messages.map((message) => (
                <ChatMessage key={message._id} message={message} />
              ))}
              {/* Streaming placeholder bubble is now part of the message
                  list itself (chat-message.tsx renders typing dots when
                  content is empty), so no separate spinner is needed
                  once a placeholder has landed. */}
              {isGenerating &&
                messages[messages.length - 1]?.role !== "assistant" && (
                  <div
                    className="flex gap-3 py-5 px-4 md:px-8"
                    aria-label="Yordamchi javob yozmoqda"
                  >
                    <div className="size-7 rounded-full bg-foreground text-background grid place-items-center flex-shrink-0">
                      <span className="block size-1.5 rounded-full bg-background" />
                    </div>
                    <div className="flex-1 space-y-2.5 pt-1">
                      <span className="text-xs font-medium tracking-tight">
                        Yordamchi
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
                        <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:120ms]" />
                        <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:240ms]" />
                      </div>
                    </div>
                  </div>
                )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border/70 bg-background px-3 py-3 md:px-6 md:py-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <ChatComposer onSend={handleSendMessage} isLoading={isGenerating} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StarterPrompts({
  isGenerating,
  onPick,
  threadId,
}: {
  isGenerating: boolean;
  onPick: (content: string, subject: ModelType) => void;
  threadId: Id<"threads"> | null;
}) {
  // Re-roll on every fresh empty thread so the user does not see the same
  // three suggestions twice in a row. threadId is the natural key — a new
  // thread = a new shuffle.
  const items = useMemo(() => pickStarterPrompts(), [threadId]);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 md:py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Savol bering
      </p>
      <h2 className="mt-2 text-2xl md:text-3xl font-medium tracking-tight leading-tight">
        Bugun nimani tushunmoqchisiz?
      </h2>
      <p className="mt-3 text-sm text-muted-foreground max-w-[60ch]">
        Mavzuni qisqa yozing yoki quyidagilardan birini tanlang — yechimni
        tushuntirib, asosiy tushunchalarni qadamlab ko‘rsatib beraman.
      </p>
      <ul className="mt-8 space-y-2">
        {items.map(({ prompt, subject }) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => onPick(prompt, subject)}
              disabled={isGenerating}
              className="group w-full text-left rounded-lg border border-border/70 bg-background hover:bg-muted/40 hover:border-border px-4 py-3 transition-colors disabled:opacity-60"
            >
              <span className="text-sm tracking-tight">{prompt}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyShell({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex h-full items-center justify-center px-4 md:px-8">
      <div className="max-w-md text-left space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {kicker}
        </p>
        <h2 className="text-2xl md:text-3xl font-medium tracking-tight leading-tight">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
