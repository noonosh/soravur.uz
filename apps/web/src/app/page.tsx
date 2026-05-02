"use client";

import UserMenu from "@/components/user-menu";
import { ChatInterface } from "@/components/chat-interface";
import { ModelSelector, type ModelType } from "@/components/model-selector";
import { SoravurIcon } from "@/components/soravur-logo";
import { api } from "@soravur/backend/convex/_generated/api";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
  useMutation,
} from "convex/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/loader";

function AuthenticatedApp() {
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const ensureUser = useMutation(api.users.ensureCurrentUserProfile);
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState<ModelType>("maths");

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
        <UserMenu />
      </header>
      <main className="flex-1 min-h-0">
        {currentUser ? (
          <ChatInterface
            userId={currentUser._id}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader />
          </div>
        )}
      </main>
    </div>
  );
}

function RedirectToSignIn() {
  const router = useRouter();
  useEffect(() => {
    router.push("/sign-in");
  }, [router]);
  return (
    <div className="min-h-[100dvh] flex items-center justify-center">
      <Loader />
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>
      <AuthLoading>
        <div className="min-h-[100dvh] flex items-center justify-center">
          <Loader />
        </div>
      </AuthLoading>
    </>
  );
}
