"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import z from "zod";

export default function ForgotPasswordPage() {
	const [submitted, setSubmitted] = useState<string | null>(null);

	const form = useForm({
		defaultValues: {
			email: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await authClient.forgetPassword({
					email: value.email,
					redirectTo: "/reset-password",
				});
				setSubmitted(value.email);
			} catch {
				// Even on error we don't reveal whether the address exists —
				// just show the same "if it exists, mail is on its way"
				// state to avoid email enumeration.
				setSubmitted(value.email);
			}
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Email manzili noto‘g‘ri"),
			}),
		},
	});

	if (submitted) {
		return (
			<div className="w-full">
				<header className="mb-8 space-y-1.5">
					<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
						Yuborildi
					</p>
					<h1 className="text-2xl md:text-3xl font-medium tracking-tight">
						Pochtangizni tekshiring.
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed">
						Agar <span className="text-foreground font-medium">{submitted}</span>{" "}
						manzili tizimda bo&apos;lsa, parolni tiklash havolasi shu manzilga
						yuboriladi. Havola 1 soat amal qiladi.
					</p>
				</header>
				<div className="space-y-3">
					<Button
						variant="outline"
						className="w-full h-10"
						onClick={() => {
							setSubmitted(null);
							toast.message("Boshqa manzilni sinab ko'ring");
						}}
					>
						Boshqa manzilni kiritish
					</Button>
					<p className="text-sm text-muted-foreground">
						<Link
							href="/sign-in"
							className="font-medium text-foreground underline-offset-4 hover:underline"
						>
							Kirish sahifasiga qaytish
						</Link>
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full">
			<header className="mb-8 space-y-1.5">
				<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
					Parolni tiklash
				</p>
				<h1 className="text-2xl md:text-3xl font-medium tracking-tight">
					Parolni unutdingizmi?
				</h1>
				<p className="text-sm text-muted-foreground leading-relaxed max-w-[36ch]">
					Email manzilingizni kiriting — parolni tiklash havolasini yuboramiz.
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

				<form.Subscribe>
					{(state) => (
						<Button
							type="submit"
							className="w-full h-10 active:translate-y-[1px] transition-transform"
							disabled={!state.canSubmit || state.isSubmitting}
						>
							{state.isSubmitting ? "Yuborilmoqda…" : "Tiklash havolasini yuborish"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<p className="mt-8 text-sm text-muted-foreground">
				<Link
					href="/sign-in"
					className="font-medium text-foreground underline-offset-4 hover:underline"
				>
					Kirish sahifasiga qaytish
				</Link>
			</p>
		</div>
	);
}
