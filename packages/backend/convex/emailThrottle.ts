import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Per-target email throttle. Ceiling is `count` sends per `windowMs`
// for a given (email, kind). Fixed-window semantics — when the window
// is exhausted the next send must wait for it to roll over.
//
// This is intentionally separate from rateLimits (which is keyed by
// userId for chat traffic). Reset/verification flows operate on an
// email address that may not yet be tied to a user, and they need to
// resist IP rotation, so a target-email throttle is the right shape.

export const checkAndIncrement = mutation({
	args: {
		targetEmail: v.string(),
		kind: v.union(v.literal("reset"), v.literal("verify")),
		limit: v.number(),
		windowMs: v.number(),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const target = args.targetEmail.trim().toLowerCase();
		if (!target) throw new Error("Email is required");

		const existing = await ctx.db
			.query("emailThrottle")
			.withIndex("by_target_kind", (q) =>
				q.eq("targetEmail", target).eq("kind", args.kind),
			)
			.unique();

		if (!existing) {
			await ctx.db.insert("emailThrottle", {
				targetEmail: target,
				kind: args.kind,
				count: 1,
				windowStart: now,
				updatedAt: now,
			});
			return;
		}

		const windowExpired = now - existing.windowStart >= args.windowMs;
		if (windowExpired) {
			await ctx.db.patch(existing._id, {
				count: 1,
				windowStart: now,
				updatedAt: now,
			});
			return;
		}

		if (existing.count >= args.limit) {
			throw new Error(
				"Juda ko'p so'rov. Iltimos, biroz keyinroq urinib ko'ring.",
			);
		}

		await ctx.db.patch(existing._id, {
			count: existing.count + 1,
			updatedAt: now,
		});
	},
});
