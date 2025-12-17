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
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 md:px-6 flex-shrink-0 relative">
        <div className="flex items-center gap-2">
          <SoravurIcon size="md" />
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold">Soravur</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">
              Imtihon yordamchisi
            </p>
          </div>
          <div className="sm:hidden">
            <h1 className="text-base font-semibold">Soravur</h1>
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

export default function Home() {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <>
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-muted/40">
          <div className="max-w-md w-full space-y-8 p-8">
            <div className="text-center space-y-3">
              <div className="mx-auto flex items-center justify-center">
                <SoravurIcon size="xl" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Soravur</h1>
              <p className="text-muted-foreground text-lg">
                O'zbek tilida imtihonlarga tayyorgarlik uchun AI yordamchi
              </p>
            </div>
            <div className="bg-card/50 backdrop-blur border rounded-xl p-6 shadow-lg">
              {showSignIn ? (
                <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
              ) : (
                <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
              )}
            </div>
          </div>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <Loader />
        </div>
      </AuthLoading>
    </>
  );
}
