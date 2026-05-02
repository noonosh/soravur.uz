import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
	usePathname: () => "/",
}));

const useConvexAuthMock = vi.fn();
const useQueryMock = vi.fn();
vi.mock("convex/react", () => ({
	useConvexAuth: () => useConvexAuthMock(),
	useQuery: () => useQueryMock(),
	useMutation: () => vi.fn(async () => undefined),
}));

// chat-interface transitively imports katex CSS through chat-message,
// which Vitest's vite/PostCSS pipeline can't process. The skeleton-state
// tests below never render ChatInterface, so a stub keeps the module
// graph clean.
vi.mock("@/components/chat-interface", () => ({
	ChatInterface: () => null,
}));

vi.mock("@/components/user-menu", () => ({
	default: () => null,
}));

vi.mock("@soravur/backend/convex/_generated/api", () => ({
	api: {
		users: {
			getCurrentUserProfile: "users.getCurrentUserProfile",
			ensureCurrentUserProfile: "users.ensureCurrentUserProfile",
		},
		auth: { getCurrentUser: "auth.getCurrentUser" },
		messages: { listMessages: "messages.listMessages" },
		threads: {
			listThreads: "threads.listThreads",
			archiveThread: "threads.archiveThread",
			unarchiveThread: "threads.unarchiveThread",
		},
	},
}));

import Home from "./page";

describe("Home page (instant load)", () => {
	beforeEach(() => {
		pushMock.mockReset();
		useConvexAuthMock.mockReset();
		useQueryMock.mockReset();
	});

	it("renders the chat shell header during AuthLoading instead of a full-screen loader", () => {
		useConvexAuthMock.mockReturnValue({
			isLoading: true,
			isAuthenticated: false,
		});
		useQueryMock.mockReturnValue(undefined);

		render(<Home />);

		// Header brand is visible from first paint.
		expect(screen.getByText("Soravur")).toBeInTheDocument();
		expect(screen.getByText("Imtihon yordamchisi")).toBeInTheDocument();

		// The old centered Loader (text: "Yuklanmoqda…") must not appear —
		// that's the regression this fix targets.
		expect(screen.queryByText(/Yuklanmoqda/)).not.toBeInTheDocument();
	});

	it("redirects to /sign-in once auth resolves as unauthenticated, without a loader flash", () => {
		useConvexAuthMock.mockReturnValue({
			isLoading: false,
			isAuthenticated: false,
		});
		useQueryMock.mockReturnValue(undefined);

		render(<Home />);

		expect(pushMock).toHaveBeenCalledWith("/sign-in");
		// Shell still rendered during the redirect window — no "Yuklanmoqda…".
		expect(screen.getByText("Soravur")).toBeInTheDocument();
		expect(screen.queryByText(/Yuklanmoqda/)).not.toBeInTheDocument();
	});

	it("does not redirect while auth is still loading", () => {
		useConvexAuthMock.mockReturnValue({
			isLoading: true,
			isAuthenticated: false,
		});
		useQueryMock.mockReturnValue(undefined);

		render(<Home />);

		expect(pushMock).not.toHaveBeenCalled();
	});
});
