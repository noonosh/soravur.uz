"use client";

import { authClient } from "@/lib/auth-client";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInForm() {
	const router = useRouter();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: () => {
						router.push("/");
						toast.success("Kirish muvaffaqiyatli");
					},
					onError: async (error) => {
						const msg = error.error.message || error.error.statusText || "";
						const code =
							(error.error as { code?: string }).code?.toLowerCase() ?? "";
						// Better-auth refuses sign-in for unverified accounts but
						// does NOT auto-resend the verification email. Without
						// this nudge the user lands on /verify-email with no
						// fresh mail in their inbox and has to manually click
						// "qayta yuborish" — confusing and the most-reported
						// production bug. Fire-and-forget the send (the page
						// also surfaces a manual resend button if this throws,
						// e.g. on emailThrottle hit).
						const lower = msg.toLowerCase();
						const isUnverified =
							code === "email_not_verified" ||
							lower.includes("verif") ||
							lower.includes("verify");
						if (isUnverified) {
							try {
								await authClient.sendVerificationEmail({
									email: value.email,
									callbackURL: "/",
								});
							} catch {
								/* noop — verify-email page can re-send */
							}
							router.push(
								`/verify-email?email=${encodeURIComponent(value.email)}`,
							);
							return;
						}
						toast.error(msg || "Kirish amalga oshmadi");
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Email manzili noto‘g‘ri"),
				password: z
					.string()
					.min(8, "Parol kamida 8 ta belgidan iborat bo‘lsin"),
			}),
		},
	});

	return (
		<div className="w-full">
			<header className="mb-8 space-y-1.5">
				<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
					Profilga kirish
				</p>
				<h1 className="text-2xl md:text-3xl font-medium tracking-tight">
					Xush kelibsiz.
				</h1>
				<p className="text-sm text-muted-foreground max-w-[36ch]">
					Imtihon yordamchingizga davom eting — barcha suhbatlaringiz saqlanadi.
				</p>
			</header>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-5"
				noValidate
			>
				<form.Field name="email">
					{(field) => {
						const error = field.state.meta.errors[0]?.message;
						return (
							<div className="space-y-1.5">
								<Label htmlFor={field.name}>Email</Label>
								<Input
									id={field.name}
									name={field.name}
									type="email"
									autoComplete="email"
									placeholder="siz@misol.uz"
									aria-invalid={!!error}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{error && (
									<p className="text-xs text-destructive" role="alert">
										{error}
									</p>
								)}
							</div>
						);
					}}
				</form.Field>

				<form.Field name="password">
					{(field) => {
						const error = field.state.meta.errors[0]?.message;
						return (
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor={field.name}>Parol</Label>
									<Link
										href="/forgot-password"
										className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
									>
										Parolni unutdingizmi?
									</Link>
								</div>
								<Input
									id={field.name}
									name={field.name}
									type="password"
									autoComplete="current-password"
									placeholder="Parolingiz"
									aria-invalid={!!error}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{error && (
									<p className="text-xs text-destructive" role="alert">
										{error}
									</p>
								)}
							</div>
						);
					}}
				</form.Field>

				<form.Subscribe>
					{(state) => (
						<Button
							type="submit"
							className="w-full h-10 active:translate-y-[1px] transition-transform"
							disabled={!state.canSubmit || state.isSubmitting}
						>
							{state.isSubmitting ? "Yuborilmoqda…" : "Kirish"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<p className="mt-8 text-sm text-muted-foreground">
				Profilingiz yo‘qmi?{" "}
				<Link
					href="/sign-up"
					className="font-medium text-foreground underline-offset-4 hover:underline"
				>
					Ro‘yxatdan o‘ting
				</Link>
			</p>
		</div>
	);
}
