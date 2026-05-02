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
					onError: (error) => {
						const msg = error.error.message || error.error.statusText || "";
						// Better-auth signals unverified email distinctly; route the
						// user to the verify-pending screen with their address so
						// they don't have to retype it.
						if (
							msg.toLowerCase().includes("verif") ||
							msg.toLowerCase().includes("verify")
						) {
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
					Hisobga kirish
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
				Hisobingiz yo‘qmi?{" "}
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
