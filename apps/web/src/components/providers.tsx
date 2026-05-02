"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "@/lib/auth-client";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

// Read NEXT_PUBLIC_CONVEX_URL with a CONVEX_URL fallback — the latter
// is what `convex deploy --cmd 'next build'` injects, and previously
// the bare `process.env.NEXT_PUBLIC_CONVEX_URL!` non-null-asserted to
// undefined and crashed prerender of /_not-found with the cryptic
// "Provided address was not an absolute URL". Throw a useful message
// instead so future env-var misses fail fast with a clear cause.
const convexUrl =
	process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
if (!convexUrl) {
	throw new Error(
		"NEXT_PUBLIC_CONVEX_URL is not set. " +
			"Configure it in Vercel project env (Production + Preview + Development scopes) " +
			"or set CONVEX_DEPLOY_KEY so `convex deploy --cmd 'next build'` injects it for you.",
	);
}
const convex = new ConvexReactClient(convexUrl);

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<ConvexBetterAuthProvider client={convex} authClient={authClient}>
				{children}
			</ConvexBetterAuthProvider>
			<Toaster richColors />
		</ThemeProvider>
	);
}
