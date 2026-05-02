"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAction } from "convex/react";
import { api } from "@soravur/backend/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { LogOut, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES: Array<{ value: "light" | "dark" | "system"; label: string }> = [
	{ value: "light", label: "Yorug'" },
	{ value: "dark", label: "Qorong'i" },
	{ value: "system", label: "Tizim" },
];

export default function SettingsPage() {
	const router = useRouter();
	const { theme, setTheme } = useTheme();
	const softDelete = useAction(api.users.softDeleteAccount);
	const [confirming, setConfirming] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const handleSignOut = async () => {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					router.push("/sign-in");
				},
			},
		});
	};

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await softDelete();
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						router.push("/sign-in");
					},
				},
			});
			toast.success("Profil o'chirildi");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "O'chirishda xatolik",
			);
		} finally {
			setDeleting(false);
			setConfirming(false);
		}
	};

	return (
		<div className="space-y-12">
			<header className="space-y-1.5">
				<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
					Sozlamalar
				</p>
				<h1 className="text-2xl md:text-3xl font-medium tracking-tight">
					Tajribangizni sozlang.
				</h1>
				<p className="text-sm text-muted-foreground">
					Mavzu, til va profil harakatlari.
				</p>
			</header>

			<section className="space-y-3">
				<Label>Mavzu</Label>
				<div className="grid grid-cols-3 gap-2 max-w-sm">
					{THEMES.map((option) => {
						const active = theme === option.value;
						return (
							<button
								key={option.value}
								type="button"
								onClick={() => setTheme(option.value)}
								className={cn(
									"h-10 rounded-md border text-sm font-medium transition-colors",
									active
										? "border-foreground/40 bg-muted/60"
										: "border-border/70 bg-background hover:bg-muted/40",
								)}
							>
								{option.label}
							</button>
						);
					})}
				</div>
			</section>

			<section className="space-y-3">
				<Label>Til</Label>
				<div className="flex items-center gap-3">
					<button
						type="button"
						disabled
						className="h-10 px-4 rounded-md border border-border/70 bg-muted/40 text-sm font-medium text-muted-foreground cursor-not-allowed"
					>
						O&apos;zbekcha
					</button>
					<span className="text-xs text-muted-foreground">
						Boshqa tillar tez orada
					</span>
				</div>
			</section>

			<section className="space-y-3 border-t border-border/70 pt-8">
				<div>
					<p className="text-sm font-medium">Sessiya</p>
					<p className="text-xs text-muted-foreground mt-1">
						Tizimdan chiqing — keyingi safar qayta kirasiz.
					</p>
				</div>
				<Button
					variant="outline"
					onClick={handleSignOut}
					className="gap-2 active:translate-y-[1px] transition-transform"
				>
					<LogOut className="h-4 w-4" strokeWidth={1.5} />
					Chiqish
				</Button>
			</section>

			<section className="space-y-3 border-t border-border/70 pt-8">
				<div>
					<p className="text-sm font-medium text-destructive">Profilni o&apos;chirish</p>
					<p className="text-xs text-muted-foreground mt-1 max-w-md leading-relaxed">
						Profilingiz o&apos;chiriladi va siz tizimga kira olmaysiz. Suhbatlaringiz
						saqlanadi va tiklash kerak bo&apos;lsa biz bilan bog&apos;laning.
					</p>
				</div>
				<Button
					variant="destructive"
					onClick={() => setConfirming(true)}
					className="gap-2 active:translate-y-[1px] transition-transform"
				>
					<Trash2 className="h-4 w-4" strokeWidth={1.5} />
					Profilni o&apos;chirish
				</Button>
			</section>

			<AlertDialog
				open={confirming}
				onOpenChange={(open) => !deleting && setConfirming(open)}
			>
				<AlertDialogContent className="border-border/70">
					<AlertDialogHeader>
						<AlertDialogTitle className="tracking-tight">
							Profilni o&apos;chirishni tasdiqlang
						</AlertDialogTitle>
						<AlertDialogDescription>
							Profilingiz o&apos;chiriladi va siz darhol tizimdan chiqarilasiz. Bu
							amalni ortga qaytarish uchun biz bilan bog&apos;laning.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>
							Bekor qilish
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={deleting}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							{deleting ? "O'chirilmoqda…" : "Ha, o'chirish"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
