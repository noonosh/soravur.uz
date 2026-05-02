import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import SignUpForm from "./sign-up-form";

const pushMock = vi.fn();
const signUpMock = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
	usePathname: () => "/",
}));
vi.mock("@/lib/auth-client", () => ({
	authClient: {
		signUp: {
			email: (...args: unknown[]) => signUpMock(...args),
		},
	},
}));
vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

describe("SignUpForm", () => {
	beforeEach(() => {
		pushMock.mockReset();
		signUpMock.mockReset();
	});

	it("rejects too-short names before calling authClient", async () => {
		render(<SignUpForm />);
		const user = userEvent.setup();
		await user.type(screen.getByLabelText(/ism/i), "A");
		await user.type(
			screen.getByRole("textbox", { name: /email/i }),
			"alice@example.com",
		);
		await user.type(screen.getByLabelText(/parol/i), "longenough123");
		await user.click(
			screen.getByRole("button", { name: /ro.?yxatdan o.?tish/i }),
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(/kamida 2/i);
		expect(signUpMock).not.toHaveBeenCalled();
	});

	it("redirects to /verify-email with the entered email on successful submit", async () => {
		signUpMock.mockImplementation(
			async (
				_payload: { email: string; password: string; name: string },
				options: { onSuccess: () => void },
			) => {
				options.onSuccess();
			},
		);
		render(<SignUpForm />);
		const user = userEvent.setup();
		await user.type(screen.getByLabelText(/ism/i), "Alisher");
		await user.type(
			screen.getByRole("textbox", { name: /email/i }),
			"alice@example.com",
		);
		await user.type(screen.getByLabelText(/parol/i), "longenough123");
		await user.click(
			screen.getByRole("button", { name: /ro.?yxatdan o.?tish/i }),
		);

		expect(signUpMock).toHaveBeenCalled();
		expect(pushMock).toHaveBeenCalledWith(
			"/verify-email?email=alice%40example.com",
		);
	});
});
