"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { SoravurIcon } from "@/components/soravur-logo";
import { Skeleton } from "@/components/ui/skeleton";

// Authenticated wrapper for /account and /settings. Same chrome as the
// chat shell but without the model selector (unrelated context); a
// quiet "back to chat" link replaces the brand cluster on the left.
function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-[100dvh] bg-background">
			<header className="h-14 border-b border-border/70 bg-background/85 backdrop-blur-md flex items-center justify-between px-4 md:px-6 flex-shrink-0">
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					<ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
					<span className="hidden sm:inline">Suhbatga qaytish</span>
				</Link>
				<div className="flex items-center gap-2.5">
					<SoravurIcon size="sm" />
					<span className="text-sm font-medium tracking-tight">Soravur</span>
				</div>
				<span aria-hidden className="w-20" />
			</header>
			<main className="px-6 py-10 md:px-10 md:py-14">
				<div className="max-w-2xl mx-auto">{children}</div>
			</main>
		</div>
	);
}

// Minimal page-body skeleton for the brief window before auth resolves
// — keeps the shell visible from first paint instead of a full-screen
// loader. Account/settings pages mount inside this once authenticated.
function PageSkeleton() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-7 w-48 rounded-md" />
			<Skeleton className="h-4 w-full rounded-md" />
			<Skeleton className="h-4 w-3/4 rounded-md" />
			<div className="pt-6 space-y-3">
				<Skeleton className="h-10 w-full rounded-md" />
				<Skeleton className="h-10 w-full rounded-md" />
			</div>
		</div>
	);
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const router = useRouter();

	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			router.push("/sign-in");
		}
	}, [isLoading, isAuthenticated, router]);

	return (
		<AppShell>{isAuthenticated ? children : <PageSkeleton />}</AppShell>
	);
}
