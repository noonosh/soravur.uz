"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import z from "zod";

function ResetPasswordInner() {
	const params = useSearchParams();
	const router = useRouter();
	const token = params.get("token") || "";
	const [done, setDone] = useState(false);

	const form = useForm({
		defaultValues: {
			password: "",
			confirm: "",
		},
		onSubmit: async ({ value }) => {
			if (!token) {
				toast.error("Tiklash havolasi noto'g'ri yoki muddati o'tgan");
				return;
			}
			if (value.password !== value.confirm) {
				toast.error("Parollar mos kelmadi");
				return;
			}
			try {
				await authClient.resetPassword({
					token,
					newPassword: value.password,
				});
				setDone(true);
				setTimeout(() => router.push("/sign-in"), 1500);
			} catch (error) {
				const msg =
					error instanceof Error ? error.message : "Tiklash amalga oshmadi";
				toast.error(msg);
			}
		},
		validators: {
			onSubmit: z.object({
				password: z
					.string()
					.min(8, "Parol kamida 8 ta belgidan iborat bo‘lsin"),
				confirm: z.string().min(8, "Parolni tasdiqlang"),
			}),
		},
	});

	if (!token) {
		return (
			<div className="w-full">
				<header className="mb-8 space-y-1.5">
					<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
						Xato havola
					</p>
					<h1 className="text-2xl md:text-3xl font-medium tracking-tight">
						Havola noto‘g‘ri.
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed">
						Tiklash havolasi yaroqsiz yoki muddati o&apos;tgan. Iltimos, qayta
						urinib ko&apos;ring.
					</p>
				</header>
				<Link
					href="/forgot-password"
					className="inline-flex h-10 items-center justify-center px-4 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90 active:translate-y-[1px] transition-transform"
				>
					Yangi havola so‘rash
				</Link>
			</div>
		);
	}

	if (done) {
		return (
			<div className="w-full">
				<header className="mb-8 space-y-1.5">
					<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
						Tugadi
					</p>
					<h1 className="text-2xl md:text-3xl font-medium tracking-tight">
						Parol o‘zgartirildi.
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed">
						Yangi parolingiz bilan kirish sahifasiga yo&apos;naltirilmoqdasiz…
					</p>
				</header>
			</div>
		);
	}

	return (
		<div className="w-full">
			<header className="mb-8 space-y-1.5">
				<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
					Yangi parol
				</p>
				<h1 className="text-2xl md:text-3xl font-medium tracking-tight">
					Parolni o‘zgartiring.
				</h1>
				<p className="text-sm text-muted-foreground leading-relaxed max-w-[36ch]">
					Kamida 8 ta belgidan iborat yangi parol o&apos;rnating.
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
				<form.Field name="password">
					{(field) => {
						const error = field.state.meta.errors[0]?.message;
						return (
							<div className="space-y-1.5">
								<Label htmlFor={field.name}>Yangi parol</Label>
								<Input
									id={field.name}
									name={field.name}
									type="password"
									autoComplete="new-password"
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

				<form.Field name="confirm">
					{(field) => {
						const error = field.state.meta.errors[0]?.message;
						return (
							<div className="space-y-1.5">
								<Label htmlFor={field.name}>Parolni tasdiqlang</Label>
								<Input
									id={field.name}
									name={field.name}
									type="password"
									autoComplete="new-password"
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
							{state.isSubmitting ? "Saqlanmoqda…" : "Parolni saqlash"}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</div>
	);
}

export default function ResetPasswordPage() {
	return (
		<Suspense fallback={null}>
			<ResetPasswordInner />
		</Suspense>
	);
}
