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

export default function SignUpForm() {
	const router = useRouter();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
			name: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{
					email: value.email,
					password: value.password,
					name: value.name,
					// Where better-auth bounces the user after the verify-link
					// handler runs (autoSignInAfterVerification). Always come
					// back to the chat shell.
					callbackURL: "/",
				},
				{
					onSuccess: () => {
						// requireEmailVerification: true means the response won't
						// include a session — push the user to the verify-pending
						// screen with their email pre-filled.
						router.push(
							`/verify-email?email=${encodeURIComponent(value.email)}`,
						);
					},
					onError: (error) => {
						toast.error(
							error.error.message ||
								error.error.statusText ||
								"Ro‘yxatdan o‘tish amalga oshmadi",
						);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "Ism kamida 2 ta belgidan iborat bo‘lsin"),
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
					Yangi hisob
				</p>
				<h1 className="text-2xl md:text-3xl font-medium tracking-tight">
					Boshlaymizmi?
				</h1>
				<p className="text-sm text-muted-foreground max-w-[36ch]">
					Bir necha soniyada ro‘yxatdan o‘ting va o‘zbek tilida savol berishni
					boshlang. Email tasdiqlashi talab qilinadi.
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
				<form.Field name="name">
					{(field) => {
						const error = field.state.meta.errors[0]?.message;
						return (
							<div className="space-y-1.5">
								<Label htmlFor={field.name}>Ism</Label>
								<Input
									id={field.name}
									name={field.name}
									autoComplete="name"
									placeholder="Ismingiz"
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
								<Label htmlFor={field.name}>Parol</Label>
								<Input
									id={field.name}
									name={field.name}
									type="password"
									autoComplete="new-password"
									placeholder="Kamida 8 ta belgi"
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
							{state.isSubmitting ? "Yuborilmoqda…" : "Ro‘yxatdan o‘tish"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<p className="mt-8 text-sm text-muted-foreground">
				Hisobingiz bormi?{" "}
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
