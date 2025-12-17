import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@soravur/backend/convex/_generated/api";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";

export default function UserMenu() {
  const router = useRouter();
  const user = useQuery(api.auth.getCurrentUser);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-1.5 md:gap-2 h-10 px-2 md:px-3 hover:bg-muted touch-manipulation"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <span className="font-medium text-sm max-w-[100px] md:max-w-[150px] truncate hidden sm:inline">
            {user?.name || "User"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 hidden sm:inline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-72 p-2 bg-card/95 backdrop-blur-xl border shadow-lg"
        align="end"
      >
        <div className="px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow-md">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base truncate">
                {user?.name || "User"}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {user?.email || "user@example.com"}
              </p>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuItem
          className="px-3 py-2.5 cursor-pointer focus:bg-muted/50 rounded-md transition-colors"
          onSelect={(e) => e.preventDefault()}
        >
          <User className="h-4 w-4 mr-3 text-muted-foreground" />
          <span className="text-sm">Profilim</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="px-3 py-2.5 cursor-pointer focus:bg-muted/50 rounded-md transition-colors"
          onSelect={(e) => e.preventDefault()}
        >
          <Settings className="h-4 w-4 mr-3 text-muted-foreground" />
          <span className="text-sm">Sozlamalar</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuItem
          className="px-3 py-2.5 cursor-pointer focus:bg-destructive/10 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
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
          <LogOut className="h-4 w-4 mr-3" />
          <span className="text-sm font-medium">Chiqish</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
