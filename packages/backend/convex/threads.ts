import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createThread = mutation({
  args: {
    title: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("threads", {
      userId: args.userId,
      title: args.title || "Yangi suhbat",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateThreadTitle = mutation({
  args: {
    threadId: v.id("threads"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const listThreads = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return threads.filter((thread) => !thread.isArchived);
  },
});

export const getThread = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId);
  },
});

export const archiveThread = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, {
      isArchived: true,
      updatedAt: Date.now(),
    });
  },
});
