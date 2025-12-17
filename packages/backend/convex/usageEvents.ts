import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const logUsage = mutation({
  args: {
    userId: v.id("users"),
    threadId: v.id("threads"),
    requestId: v.string(),
    model: v.string(),
    tokensTotal: v.optional(v.number()),
    costEstimateUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("usageEvents", {
      userId: args.userId,
      threadId: args.threadId,
      requestId: args.requestId,
      model: args.model,
      createdAt: Date.now(),
      tokensTotal: args.tokensTotal,
      costEstimateUsd: args.costEstimateUsd,
    });
  },
});

export const getUserUsage = query({
  args: {
    userId: v.id("users"),
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allEvents = await ctx.db
      .query("usageEvents")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter by date if provided
    const events = args.since
      ? allEvents.filter((e) => e.createdAt >= args.since!)
      : allEvents;

    const totalTokens = events.reduce(
      (sum, e) => sum + (e.tokensTotal || 0),
      0
    );
    const totalCost = events.reduce(
      (sum, e) => sum + (e.costEstimateUsd || 0),
      0
    );

    return {
      events,
      totalTokens,
      totalCost,
      eventCount: events.length,
    };
  },
});
