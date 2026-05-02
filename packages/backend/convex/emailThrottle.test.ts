import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

// emailThrottle is the second line of defence (per-target). We test
// that within-window calls increment, beyond-limit calls throw, and
// the window resets after the configured duration.

// @ts-expect-error vite-only API; available at test runtime.
const modules = import.meta.glob("./**/*.{ts,js}");

describe("emailThrottle.checkAndIncrement", () => {
	it("permits the first send and increments on subsequent sends within the window", async () => {
		const t = convexTest(schema, modules);
		await t.mutation(api.emailThrottle.checkAndIncrement, {
			targetEmail: "user@example.com",
			kind: "reset",
			limit: 3,
			windowMs: 60_000,
		});
		await t.mutation(api.emailThrottle.checkAndIncrement, {
			targetEmail: "user@example.com",
			kind: "reset",
			limit: 3,
			windowMs: 60_000,
		});
		const row = await t.run(async (ctx) =>
			ctx.db
				.query("emailThrottle")
				.withIndex("by_target_kind", (q) =>
					q.eq("targetEmail", "user@example.com").eq("kind", "reset"),
				)
				.unique(),
		);
		expect(row?.count).toBe(2);
	});

	it("throws once the limit is exceeded inside the window", async () => {
		const t = convexTest(schema, modules);
		for (let i = 0; i < 3; i++) {
			await t.mutation(api.emailThrottle.checkAndIncrement, {
				targetEmail: "spam@example.com",
				kind: "reset",
				limit: 3,
				windowMs: 60_000,
			});
		}
		await expect(
			t.mutation(api.emailThrottle.checkAndIncrement, {
				targetEmail: "spam@example.com",
				kind: "reset",
				limit: 3,
				windowMs: 60_000,
			}),
		).rejects.toThrow(/Juda ko'p so'rov/);
	});

	it("resets the counter after the window elapses", async () => {
		const t = convexTest(schema, modules);
		await t.mutation(api.emailThrottle.checkAndIncrement, {
			targetEmail: "windowed@example.com",
			kind: "reset",
			limit: 1,
			windowMs: 1, // immediately expires
		});
		await new Promise((resolve) => setTimeout(resolve, 5));
		// Window has rolled — next call should succeed and reset count to 1.
		await t.mutation(api.emailThrottle.checkAndIncrement, {
			targetEmail: "windowed@example.com",
			kind: "reset",
			limit: 1,
			windowMs: 1,
		});
		const row = await t.run(async (ctx) =>
			ctx.db
				.query("emailThrottle")
				.withIndex("by_target_kind", (q) =>
					q.eq("targetEmail", "windowed@example.com").eq("kind", "reset"),
				)
				.unique(),
		);
		expect(row?.count).toBe(1);
	});

	it("treats targetEmail case-insensitively (normalises to lowercase)", async () => {
		const t = convexTest(schema, modules);
		await t.mutation(api.emailThrottle.checkAndIncrement, {
			targetEmail: "Mixed@Example.com",
			kind: "verify",
			limit: 5,
			windowMs: 60_000,
		});
		await t.mutation(api.emailThrottle.checkAndIncrement, {
			targetEmail: "mixed@example.com",
			kind: "verify",
			limit: 5,
			windowMs: 60_000,
		});
		const rows = await t.run(async (ctx) =>
			ctx.db.query("emailThrottle").collect(),
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].count).toBe(2);
	});

	it("keeps reset and verify counters separate", async () => {
		const t = convexTest(schema, modules);
		await t.mutation(api.emailThrottle.checkAndIncrement, {
			targetEmail: "kinds@example.com",
			kind: "reset",
			limit: 1,
			windowMs: 60_000,
		});
		await t.mutation(api.emailThrottle.checkAndIncrement, {
			targetEmail: "kinds@example.com",
			kind: "verify",
			limit: 1,
			windowMs: 60_000,
		});
		const rows = await t.run(async (ctx) =>
			ctx.db.query("emailThrottle").collect(),
		);
		expect(rows).toHaveLength(2);
	});
});
