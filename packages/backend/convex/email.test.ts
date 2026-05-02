import { describe, expect, it } from "vitest";
import {
	accountDeletedEmail,
	CapturingEmailSender,
	passwordResetEmail,
	verificationEmail,
} from "./email";

// Templates are inline strings so the only way they can break is by
// regression. These tests assert structural invariants (URL embedded,
// Uzbek-only copy, plain-text fallback present) so that future edits
// preserve them.

describe("email templates", () => {
	it("verificationEmail embeds the verify URL in both HTML and text", () => {
		const message = verificationEmail({
			to: "alice@example.com",
			url: "https://example.com/verify?token=abc",
			displayName: "Alisher",
		});
		expect(message.to).toBe("alice@example.com");
		expect(message.html).toContain("https://example.com/verify?token=abc");
		expect(message.text).toContain("https://example.com/verify?token=abc");
		expect(message.subject).toMatch(/tasdiqlang/i);
		// Greeting personalised when a name is provided.
		expect(message.html).toContain("Salom, Alisher!");
	});

	it("verificationEmail falls back to a generic greeting without a name", () => {
		const message = verificationEmail({
			to: "alice@example.com",
			url: "https://example.com/verify?token=abc",
		});
		expect(message.html).toContain("Salom!");
		expect(message.html).not.toContain("Salom, ");
	});

	it("passwordResetEmail mentions a 1-hour expiry in the text body", () => {
		const message = passwordResetEmail({
			to: "alice@example.com",
			url: "https://example.com/reset?token=def",
		});
		expect(message.text).toContain("1 soat");
		expect(message.html).toContain("https://example.com/reset?token=def");
		expect(message.subject).toMatch(/tiklang/i);
	});

	it("accountDeletedEmail does not include any action URL", () => {
		const message = accountDeletedEmail({
			to: "alice@example.com",
		});
		// Inert — should not include a clickable button or token URL.
		expect(message.html).not.toMatch(/href=\"https:\/\/.*token/);
		expect(message.subject).toMatch(/o'chirildi/i);
	});

	// Wording lock: the project moved from "hisob" (literally "account",
	// but reads as "bill/calculation" to many Uzbek speakers) to
	// "profil". These guards keep email copy from drifting back.
	it("email templates use 'profil' wording, not 'hisob'", () => {
		const verify = verificationEmail({
			to: "alice@example.com",
			url: "https://example.com/v",
		});
		const reset = passwordResetEmail({
			to: "alice@example.com",
			url: "https://example.com/r",
		});
		const deleted = accountDeletedEmail({ to: "alice@example.com" });

		for (const m of [verify, reset, deleted]) {
			expect(m.subject.toLowerCase()).not.toMatch(/hisob/);
			expect(m.html.toLowerCase()).not.toMatch(/hisob/);
			expect(m.text.toLowerCase()).not.toMatch(/hisob/);
		}

		expect(verify.subject.toLowerCase()).toContain("profil");
		expect(verify.html.toLowerCase()).toContain("profil");
		expect(reset.html.toLowerCase()).toContain("profil");
		expect(deleted.subject.toLowerCase()).toContain("profil");
		expect(deleted.html.toLowerCase()).toContain("profil");
	});

	it("CapturingEmailSender records dispatched messages without sending", async () => {
		const sender = new CapturingEmailSender();
		await sender.send({
			to: "a@example.com",
			subject: "Hi",
			html: "<p>Hi</p>",
			text: "Hi",
		});
		await sender.send({
			to: "b@example.com",
			subject: "Hi 2",
			html: "<p>Hi 2</p>",
			text: "Hi 2",
		});
		expect(sender.sent).toHaveLength(2);
		expect(sender.sent[1].to).toBe("b@example.com");
	});
});
