import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import {
	CapturingEmailSender,
} from "./email";
import { setEmailSenderForUsers } from "./users";

// Covers the auth-bound user-profile queries and the soft-delete
// flow (mutation + action wrapper). withIdentity provides a stub
// auth identity so getUserIdentity() returns the test subject.

// @ts-expect-error vite-only API; available at test runtime.
const modules = import.meta.glob("./**/*.{ts,js}");

const TEST_IDENTITY = {
	subject: "test|user-1",
	issuer: "test",
	tokenIdentifier: "test|user-1",
	email: "alice@example.com",
	name: "Alice",
};

describe("users", () => {
	it("ensureCurrentUserProfile creates a row on first call and returns it on the second", async () => {
		const t = convexTest(schema, modules);
		const tWithUser = t.withIdentity(TEST_IDENTITY);

		const first = await tWithUser.mutation(
			api.users.ensureCurrentUserProfile,
			{},
		);
		expect(first?.authSubject).toBe(TEST_IDENTITY.subject);
		const id = first!._id;

		const second = await tWithUser.mutation(
			api.users.ensureCurrentUserProfile,
			{},
		);
		expect(second?._id).toBe(id);
	});

	it("getCurrentUserProfile returns null for a soft-deleted user", async () => {
		const t = convexTest(schema, modules);
		const tWithUser = t.withIdentity(TEST_IDENTITY);
		const profile = await tWithUser.mutation(
			api.users.ensureCurrentUserProfile,
			{},
		);
		await t.run(async (ctx) => {
			await ctx.db.patch(profile!._id, {
				isDeleted: true,
				deletedAt: Date.now(),
			});
		});

		const result = await tWithUser.query(api.users.getCurrentUserProfile, {});
		expect(result).toBeNull();
	});

	it("ensureCurrentUserProfile refuses to revive a soft-deleted user", async () => {
		const t = convexTest(schema, modules);
		const tWithUser = t.withIdentity(TEST_IDENTITY);
		const profile = await tWithUser.mutation(
			api.users.ensureCurrentUserProfile,
			{},
		);
		await t.run(async (ctx) => {
			await ctx.db.patch(profile!._id, {
				isDeleted: true,
				deletedAt: Date.now(),
			});
		});

		await expect(
			tWithUser.mutation(api.users.ensureCurrentUserProfile, {}),
		).rejects.toThrow(/Account deleted/);
	});

	describe("updateProfile", () => {
		it("trims and persists a valid display name", async () => {
			const t = convexTest(schema, modules);
			const tWithUser = t.withIdentity(TEST_IDENTITY);
			await tWithUser.mutation(api.users.ensureCurrentUserProfile, {});

			const updated = await tWithUser.mutation(api.users.updateProfile, {
				displayName: "  Bobur Mirzo  ",
			});
			expect(updated?.displayName).toBe("Bobur Mirzo");
		});

		it("rejects too-short names", async () => {
			const t = convexTest(schema, modules);
			const tWithUser = t.withIdentity(TEST_IDENTITY);
			await tWithUser.mutation(api.users.ensureCurrentUserProfile, {});

			await expect(
				tWithUser.mutation(api.users.updateProfile, { displayName: "A" }),
			).rejects.toThrow(/kamida 2/);
		});

		it("rejects unauthenticated callers", async () => {
			const t = convexTest(schema, modules);
			await expect(
				t.mutation(api.users.updateProfile, { displayName: "Bobur" }),
			).rejects.toThrow(/Not authenticated/);
		});
	});

	describe("softDeleteAccount", () => {
		it("flips the flag and sends the deletion email exactly once", async () => {
			const t = convexTest(schema, modules);
			const tWithUser = t.withIdentity(TEST_IDENTITY);
			await tWithUser.mutation(api.users.ensureCurrentUserProfile, {});

			const capturing = new CapturingEmailSender();
			setEmailSenderForUsers(capturing);
			try {
				await tWithUser.action(api.users.softDeleteAccount, {});
				// Calling again must be idempotent — no second email sent.
				await tWithUser.action(api.users.softDeleteAccount, {});
			} finally {
				setEmailSenderForUsers(null);
			}

			expect(capturing.sent).toHaveLength(1);
			expect(capturing.sent[0].to).toBe(TEST_IDENTITY.email);
			expect(capturing.sent[0].subject).toMatch(/o'chirildi/i);

			const userRow = await t.run(async (ctx) =>
				ctx.db
					.query("users")
					.withIndex("by_auth_subject", (q) =>
						q.eq("authSubject", TEST_IDENTITY.subject),
					)
					.unique(),
			);
			expect(userRow?.isDeleted).toBe(true);
			expect(userRow?.deletedAt).toBeTypeOf("number");
		});
	});
});
