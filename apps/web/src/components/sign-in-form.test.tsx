import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import SignInForm from "./sign-in-form";

const signInMock = vi.fn();
vi.mock("@/lib/auth-client", () => ({
	authClient: {
		signIn: {
			email: (...args: unknown[]) => signInMock(...args),
		},
	},
}));
vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

describe("SignInForm", () => {
	beforeEach(() => {
		signInMock.mockReset();
	});

	it("renders email + password inputs and the forgot-password link", () => {
		render(<SignInForm />);
		expect(
			screen.getByRole("textbox", { name: /email/i }),
		).toBeInTheDocument();
		expect(screen.getByLabelText(/parol/i)).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /unutdingiz/i }),
		).toHaveAttribute("href", "/forgot-password");
	});

	it("shows a validation message for an invalid email on submit", async () => {
		render(<SignInForm />);
		const user = userEvent.setup();
		await user.type(
			screen.getByRole("textbox", { name: /email/i }),
			"not-an-email",
		);
		await user.type(screen.getByLabelText(/parol/i), "longenough123");
		await user.click(screen.getByRole("button", { name: /^kirish$/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(/noto/i);
		expect(signInMock).not.toHaveBeenCalled();
	});

	it("calls authClient.signIn.email with valid input", async () => {
		// Resolve the underlying promise so the form's onSubmit completes.
		signInMock.mockImplementation(async () => undefined);
		render(<SignInForm />);
		const user = userEvent.setup();
		await user.type(
			screen.getByRole("textbox", { name: /email/i }),
			"alice@example.com",
		);
		await user.type(screen.getByLabelText(/parol/i), "longenough123");
		await user.click(screen.getByRole("button", { name: /^kirish$/i }));

		expect(signInMock).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "alice@example.com",
				password: "longenough123",
			}),
			expect.any(Object),
		);
	});
});
