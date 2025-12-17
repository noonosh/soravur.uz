"use client";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import UserMenu from "@/components/user-menu";
import { ChatInterface } from "@/components/chat-interface";
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

function AuthenticatedDashboard() {
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const ensureUser = useMutation(api.users.ensureCurrentUserProfile);

  // Ensure user profile exists
  useEffect(() => {
    if (currentUser === null) {
      ensureUser();
    }
  }, [currentUser, ensureUser]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold">Soravur</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">
              Imtihon yordamchisi
            </p>
          </div>
        </div>
        <UserMenu />
      </header>
      <main className="flex-1 overflow-hidden">
        {currentUser ? (
          <ChatInterface userId={currentUser._id} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader />
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <>
      <Authenticated>
        <AuthenticatedDashboard />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-muted/40">
          <div className="max-w-md w-full space-y-8 p-8">
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-2xl mx-auto">
                <span className="text-white font-bold text-2xl">S</span>
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
