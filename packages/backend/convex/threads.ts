import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createThread = mutation({
  args: {
    title: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Refuse to create a thread for a soft-deleted user — should never
    // happen in practice (UI gates on isDeleted) but cheap to defend.
    const user = await ctx.db.get(args.userId);
    if (!user || user.isDeleted) {
      throw new Error("User not available");
    }

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

// Single source of truth for both active and archived views. The web
// client switches between them via the sidebar tab; backend stays one
// query with one parameter.
export const listThreads = query({
  args: {
    userId: v.id("users"),
    view: v.optional(
      v.union(v.literal("active"), v.literal("archived"))
    ),
  },
  handler: async (ctx, args) => {
    const view = args.view ?? "active";
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return view === "archived"
      ? threads.filter((t) => t.isArchived === true)
      : threads.filter((t) => !t.isArchived);
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

export const unarchiveThread = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, {
      isArchived: false,
      updatedAt: Date.now(),
    });
  },
});
