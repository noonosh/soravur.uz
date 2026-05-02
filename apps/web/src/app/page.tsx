"use client";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
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
import Loader from "@/components/loader";

function AuthenticatedApp() {
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const ensureUser = useMutation(api.users.ensureCurrentUserProfile);
  const [selectedModel, setSelectedModel] = useState<ModelType>("maths");

  // Ensure user profile exists
  useEffect(() => {
    if (currentUser === null) {
      ensureUser();
    }
  }, [currentUser, ensureUser]);

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

function AuthShell({
  showSignIn,
  onToggle,
}: {
  showSignIn: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-background">
      {/* Left: brand statement. Hidden on mobile to keep the form
          first-paint fast. */}
      <aside className="hidden lg:flex flex-col justify-between border-r border-border/70 px-12 py-10">
        <div className="flex items-center gap-2.5">
          <SoravurIcon size="sm" />
          <span className="text-sm font-medium tracking-tight">Soravur</span>
        </div>

        <div className="max-w-[34ch] space-y-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            O‘zbek tilida AI yordamchi
          </p>
          <h2 className="text-3xl xl:text-4xl font-medium leading-[1.15] tracking-tight">
            Imtihonga tayyorgarlikni{" "}
            <span className="text-brand">qadamma-qadam</span> tushunib boring.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Matematika, adabiyot, dasturlash — savolingizni o‘zbekcha yozing,
            yechimni tushuntirib beraman.
          </p>
        </div>

        <p className="text-xs text-muted-foreground/80">Soravur · 2026</p>
      </aside>

      {/* Right: form column. */}
      <section className="flex items-center justify-center px-6 py-10 sm:px-10 md:px-16">
        <div className="w-full max-w-sm">
          {/* Mobile-only brand mark */}
          <div className="lg:hidden mb-10 flex items-center gap-2.5">
            <SoravurIcon size="sm" />
            <span className="text-sm font-medium tracking-tight">Soravur</span>
          </div>

          {showSignIn ? (
            <SignInForm onSwitchToSignUp={() => onToggle(false)} />
          ) : (
            <SignUpForm onSwitchToSignIn={() => onToggle(true)} />
          )}
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <>
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
      <Unauthenticated>
        <AuthShell showSignIn={showSignIn} onToggle={setShowSignIn} />
      </Unauthenticated>
      <AuthLoading>
        <div className="min-h-[100dvh] flex items-center justify-center">
          <Loader />
        </div>
      </AuthLoading>
    </>
  );
}
