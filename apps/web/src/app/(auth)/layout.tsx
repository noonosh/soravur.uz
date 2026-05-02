import type { ReactNode } from "react";
import { SoravurIcon } from "@/components/soravur-logo";

// Shared shell for every auth route. Asymmetric 1.1fr/1fr split with
// a brand statement on the left and the form on the right; collapses
// to a single column under lg. Mirrors the design used pre-routing
// (was inline in page.tsx) so the look is unchanged.
export default function AuthLayout({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-background">
			<aside className="hidden lg:flex flex-col justify-between border-r border-border/70 px-12 py-10">
				<div className="flex items-center gap-2.5">
					<SoravurIcon size="sm" />
					<span className="text-sm font-medium tracking-tight">Soravur</span>
				</div>

				<div className="max-w-[34ch] space-y-6">
					<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
						O&apos;zbek tilida AI yordamchi
					</p>
					<h2 className="text-3xl xl:text-4xl font-medium leading-[1.15] tracking-tight">
						Imtihonga tayyorgarlikni{" "}
						<span className="text-brand">qadamma-qadam</span> tushunib boring.
					</h2>
					<p className="text-sm text-muted-foreground leading-relaxed">
						Matematika, adabiyot, dasturlash — savolingizni o&apos;zbekcha yozing,
						yechimni tushuntirib beraman.
					</p>
				</div>

				<p className="text-xs text-muted-foreground/80">Soravur · 2026</p>
			</aside>

			<section className="flex items-center justify-center px-6 py-10 sm:px-10 md:px-16">
				<div className="w-full max-w-sm">
					<div className="lg:hidden mb-10 flex items-center gap-2.5">
						<SoravurIcon size="sm" />
						<span className="text-sm font-medium tracking-tight">Soravur</span>
					</div>
					{children}
				</div>
			</section>
		</div>
	);
}
