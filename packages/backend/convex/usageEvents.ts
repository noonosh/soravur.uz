import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function startOfDayMs(now: number): number {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

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

// Today's token totals (UTC day) for a user and globally. Used by the
// chat action to enforce daily caps before calling OpenRouter.
export const getDailyTokens = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const since = startOfDayMs(Date.now());

    const userEvents = await ctx.db
      .query("usageEvents")
      .withIndex("by_user_createdAt", (q) =>
        q.eq("userId", args.userId).gte("createdAt", since)
      )
      .collect();

    const globalEvents = await ctx.db
      .query("usageEvents")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", since))
      .collect();

    const sumTokens = (rows: Array<{ tokensTotal?: number }>) =>
      rows.reduce((s, r) => s + (r.tokensTotal || 0), 0);

    return {
      userTokens: sumTokens(userEvents),
      globalTokens: sumTokens(globalEvents),
      sinceMs: since,
    };
  },
});

// Admin-only: recent usage events across all users + 24h totals.
// Gated by the ADMIN_EMAILS env var (comma-separated). The caller must
// be authenticated and their email must appear in that list.
export const getAdminUsage = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const callerEmail = (identity.email || "").toLowerCase();
    if (!callerEmail || !adminEmails.includes(callerEmail)) {
      throw new Error("Forbidden");
    }

    const since = startOfDayMs(Date.now());
    const limit = Math.min(args.limit ?? 100, 500);

    const recentDesc = await ctx.db
      .query("usageEvents")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", since))
      .order("desc")
      .take(limit);

    const dailyEvents = await ctx.db
      .query("usageEvents")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", since))
      .collect();

    const totals = {
      events: dailyEvents.length,
      tokens: dailyEvents.reduce((s, e) => s + (e.tokensTotal || 0), 0),
      cost: dailyEvents.reduce((s, e) => s + (e.costEstimateUsd || 0), 0),
      uniqueUsers: new Set(dailyEvents.map((e) => e.userId)).size,
    };

    return { sinceMs: since, totals, recent: recentDesc };
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
