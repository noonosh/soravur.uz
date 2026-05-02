"use client";

import UserMenu from "@/components/user-menu";
import { ChatInterface } from "@/components/chat-interface";
import { ModelSelector, type ModelType } from "@/components/model-selector";
import { SoravurIcon } from "@/components/soravur-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@soravur/backend/convex/_generated/api";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Empty sidebar+main shell that matches the chat layout. Used during
// the brief window between first paint and Convex auth/profile resolve
// — keeps the page structurally identical to the loaded state so there
// is no full-screen loader flash on refresh.
function ChatBootstrapSkeleton() {
  return (
    <div className="flex h-full overflow-hidden">
      <aside className="hidden lg:flex w-72 border-r border-border/70 flex-col flex-shrink-0">
        <div className="px-4 h-14 border-b border-border/70 flex items-center">
          <Skeleton className="h-3 w-20 rounded" />
        </div>
        <div className="flex-1 min-h-0 p-3 space-y-2">
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      </aside>
      <div className="flex-1" />
    </div>
  );
}

function AuthenticatedChat({
  selectedModel,
  onModelChange,
}: {
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
}) {
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const ensureUser = useMutation(api.users.ensureCurrentUserProfile);
  const router = useRouter();

  // Materialize the profile, but bail to /sign-in if the row is gone
  // (soft-deleted account or revoked auth) — getCurrentUserProfile
  // returns null in both cases.
  useEffect(() => {
    if (currentUser === null) {
      ensureUser().catch((error) => {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("Account deleted")) {
          router.push("/sign-in");
        }
      });
    }
  }, [currentUser, ensureUser, router]);

  if (!currentUser) return <ChatBootstrapSkeleton />;
  return (
    <ChatInterface
      userId={currentUser._id}
      selectedModel={selectedModel}
      onModelChange={onModelChange}
    />
  );
}

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState<ModelType>("maths");

  // Redirect unauthenticated users without a full-screen loader flash —
  // the shell+skeleton below stays mounted until the route changes.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="min-h-[100dvh] h-[100dvh] flex flex-col bg-background overflow-hidden">
      <header className="h-14 border-b border-border/70 bg-background/85 backdrop-blur-md flex items-center justify-between px-4 md:px-6 flex-shrink-0 relative">
        <div className="flex items-center gap-2.5">
          <SoravurIcon size="sm" />
          <div className="leading-tight">
            <p className="text-sm font-medium tracking-tight">Soravur</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground -mt-0.5">
              Imtihon yordamchisi
            </p>
          </div>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </div>
        {isAuthenticated ? <UserMenu /> : <span aria-hidden className="w-9" />}
      </header>
      <main className="flex-1 min-h-0">
        {isAuthenticated ? (
          <AuthenticatedChat
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        ) : (
          <ChatBootstrapSkeleton />
        )}
      </main>
    </div>
  );
}
