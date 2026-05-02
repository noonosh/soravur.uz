"use client";

import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { api } from "@soravur/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import z from "zod";

export default function AccountPage() {
	const user = useQuery(api.users.getCurrentUserProfile);
	const authUser = useQuery(api.auth.getCurrentUser);
	const updateProfile = useMutation(api.users.updateProfile);

	const form = useForm({
		defaultValues: {
			displayName: user?.displayName ?? "",
		},
		onSubmit: async ({ value }) => {
			try {
				await updateProfile({ displayName: value.displayName });
				toast.success("Saqlandi");
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Saqlashda xatolik",
				);
			}
		},
		validators: {
			onSubmit: z.object({
				displayName: z
					.string()
					.min(2, "Ism kamida 2 ta belgidan iborat bo'lsin")
					.max(60, "Ism juda uzun"),
			}),
		},
	});

	// Reset the form's default once the user query resolves so the
	// input mounts with the persisted name rather than an empty string.
	useEffect(() => {
		if (user?.displayName) {
			form.setFieldValue("displayName", user.displayName);
		}
	}, [user?.displayName, form]);

	return (
		<div className="space-y-10">
			<header className="space-y-1.5">
				<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
					Profil
				</p>
				<h1 className="text-2xl md:text-3xl font-medium tracking-tight">
					Mening profilim.
				</h1>
				<p className="text-sm text-muted-foreground">
					Ism va email manzilingizni shu yerdan boshqaring.
				</p>
			</header>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-6"
				noValidate
			>
				<div className="space-y-1.5">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						type="email"
						value={authUser?.email ?? ""}
						disabled
						readOnly
					/>
					<p className="text-xs text-muted-foreground">
						Email manzilini o&apos;zgartirish hozircha qo&apos;llab
						quvvatlanmaydi.
					</p>
				</div>

				<form.Field name="displayName">
					{(field) => {
						const error = field.state.meta.errors[0]?.message;
						return (
							<div className="space-y-1.5">
								<Label htmlFor={field.name}>Ism</Label>
								<Input
									id={field.name}
									name={field.name}
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
							className="active:translate-y-[1px] transition-transform"
							disabled={!state.canSubmit || state.isSubmitting}
						>
							{state.isSubmitting ? "Saqlanmoqda…" : "Saqlash"}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</div>
	);
}
