import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
	useQuery: () => undefined,
}));

vi.mock("@soravur/backend/convex/_generated/api", () => ({
	api: {
		auth: { getCurrentUser: "auth.getCurrentUser" },
		users: { getCurrentUserProfile: "users.getCurrentUserProfile" },
	},
}));

vi.mock("@/lib/auth-client", () => ({
	authClient: { signOut: vi.fn() },
}));

import UserMenu from "./user-menu";

describe("UserMenu wording", () => {
	it("links to /account labelled 'Mening profilim' (not 'Hisob')", async () => {
		render(<UserMenu />);
		const user = userEvent.setup();
		// Radix renders the dropdown content into a portal only after the
		// trigger opens — open it before asserting on menu items.
		await user.click(screen.getByRole("button"));

		const link = await screen.findByRole("menuitem", {
			name: /mening profilim/i,
		});
		expect(link).toHaveAttribute("href", "/account");
		// Regression guard: the old "Hisob" string must not survive.
		expect(screen.queryByText(/^Hisob$/)).not.toBeInTheDocument();
	});
});
