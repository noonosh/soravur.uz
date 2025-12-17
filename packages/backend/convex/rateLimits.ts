import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const checkAndIncrement = mutation({
  args: {
    userId: v.id("users"),
    windowMs: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const windowStart = Math.floor(now / args.windowMs) * args.windowMs;
    const windowKey = `${windowStart}`;

    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_window", (q) =>
        q.eq("userId", args.userId).eq("windowKey", windowKey)
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("rateLimits", {
        userId: args.userId,
        windowKey,
        count: 1,
        windowStart,
        updatedAt: now,
      });
      return;
    }

    if (existing.count >= args.limit) {
      throw new Error(
        "Juda ko‘p so‘rov yuborildi. Iltimos, biroz kutib qayta urinib ko‘ring."
      );
    }

    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
      updatedAt: now,
    });
  },
});
