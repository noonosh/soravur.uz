// Quiet, brand-colored loader. Three pulsing dots — gentler than a
// spinning circle for full-screen auth-loading states.
export default function Loader({ label }: { label?: string }) {
	return (
		<div
			className="flex flex-col items-center justify-center gap-3 pt-8"
			role="status"
			aria-live="polite"
		>
			<div className="flex items-center gap-1.5" aria-hidden>
				<span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
				<span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:120ms]" />
				<span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:240ms]" />
			</div>
			<span className="text-xs text-muted-foreground tracking-tight">
				{label ?? "Yuklanmoqda…"}
			</span>
		</div>
	);
}
