"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function VerifyEmailInner() {
	const params = useSearchParams();
	const email = params.get("email") || "";
	const [sending, setSending] = useState(false);
	const [sentAt, setSentAt] = useState<number | null>(null);

	const cooldownLeft = sentAt
		? Math.max(0, 30 - Math.floor((Date.now() - sentAt) / 1000))
		: 0;
	const onCooldown = cooldownLeft > 0;

	const handleResend = async () => {
		if (!email || sending || onCooldown) return;
		setSending(true);
		try {
			await authClient.sendVerificationEmail({
				email,
				callbackURL: "/",
			});
			setSentAt(Date.now());
			toast.success("Tasdiqlash xati yuborildi");
		} catch {
			toast.error("Yuborishda xatolik. Biroz keyin urinib ko'ring.");
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="w-full">
			<header className="mb-8 space-y-1.5">
				<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
					Tasdiqlash kerak
				</p>
				<h1 className="text-2xl md:text-3xl font-medium tracking-tight">
					Pochtangizni tekshiring.
				</h1>
				<p className="text-sm text-muted-foreground leading-relaxed">
					{email ? (
						<>
							Tasdiqlash havolasi{" "}
							<span className="text-foreground font-medium">{email}</span>{" "}
							manziliga yuborildi. Havolaga bosing va ro&apos;yxatdan
							o&apos;tishni tugating.
						</>
					) : (
						<>
							Tasdiqlash havolasini elektron pochtangizga yubordik. Havolaga
							bosing va ro&apos;yxatdan o&apos;tishni tugating.
						</>
					)}
				</p>
			</header>

			<div className="space-y-4">
				<Button
					type="button"
					variant="outline"
					className="w-full h-10"
					onClick={handleResend}
					disabled={!email || sending || onCooldown}
				>
					{sending
						? "Yuborilmoqda…"
						: onCooldown
							? `Qayta yuborish ${cooldownLeft}s`
							: "Xatni qayta yuborish"}
				</Button>
				<p className="text-xs text-muted-foreground leading-relaxed">
					Xatni topa olmayapsizmi? Spam papkasini tekshiring yoki bir necha
					daqiqa kuting — ba&apos;zan yetib borishi vaqt oladi.
				</p>
			</div>

			<p className="mt-8 text-sm text-muted-foreground">
				Boshqa profilga kirmoqchimisiz?{" "}
				<Link
					href="/sign-in"
					className="font-medium text-foreground underline-offset-4 hover:underline"
				>
					Kirish
				</Link>
			</p>
		</div>
	);
}

export default function VerifyEmailPage() {
	// useSearchParams must be wrapped in Suspense for static rendering.
	return (
		<Suspense fallback={null}>
			<VerifyEmailInner />
		</Suspense>
	);
}
