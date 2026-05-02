import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@soravur/backend/convex/_generated/api";
import { User, Settings, LogOut } from "lucide-react";

function initialOf(name?: string | null, email?: string | null): string {
	const source = (name || email || "U").trim();
	return source.charAt(0).toUpperCase();
}

export default function UserMenu() {
	const router = useRouter();
	const user = useQuery(api.auth.getCurrentUser);

	const initial = initialOf(user?.name, user?.email);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="h-9 px-1.5 gap-2 hover:bg-muted/60 focus-visible:ring-1"
				>
					<span
						aria-hidden
						className="grid place-items-center size-7 rounded-full bg-foreground text-background text-[11px] font-medium tracking-tight"
					>
						{initial}
					</span>
					<span className="hidden sm:inline text-sm font-medium max-w-[140px] truncate">
						{user?.name || "Foydalanuvchi"}
					</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-64 p-1.5 border-border/70"
				align="end"
				sideOffset={8}
			>
				<div className="px-2.5 py-2.5 flex items-center gap-3">
					<span
						aria-hidden
						className="grid place-items-center size-9 rounded-full bg-foreground text-background text-sm font-medium"
					>
						{initial}
					</span>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium truncate leading-tight">
							{user?.name || "Foydalanuvchi"}
						</p>
						<p className="text-xs text-muted-foreground truncate mt-0.5">
							{user?.email || "—"}
						</p>
					</div>
				</div>

				<DropdownMenuSeparator className="my-1" />

				<DropdownMenuItem asChild className="px-2.5 py-2 text-sm cursor-pointer rounded-sm">
					<Link href="/account" className="flex items-center w-full">
						<User
							className="h-4 w-4 mr-2.5 text-muted-foreground"
							strokeWidth={1.5}
						/>
						Hisob
					</Link>
				</DropdownMenuItem>

				<DropdownMenuItem asChild className="px-2.5 py-2 text-sm cursor-pointer rounded-sm">
					<Link href="/settings" className="flex items-center w-full">
						<Settings
							className="h-4 w-4 mr-2.5 text-muted-foreground"
							strokeWidth={1.5}
						/>
						Sozlamalar
					</Link>
				</DropdownMenuItem>

				<DropdownMenuSeparator className="my-1" />

				<DropdownMenuItem
					className="px-2.5 py-2 text-sm cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 rounded-sm"
					onClick={() => {
						authClient.signOut({
							fetchOptions: {
								onSuccess: () => {
									router.push("/");
								},
							},
						});
					}}
				>
					<LogOut className="h-4 w-4 mr-2.5" strokeWidth={1.5} />
					Chiqish
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
