import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const appendUserMessage = mutation({
  args: {
    threadId: v.id("threads"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Update thread's updatedAt
    await ctx.db.patch(args.threadId, {
      updatedAt: Date.now(),
    });

    return await ctx.db.insert("messages", {
      threadId: args.threadId,
      role: "user",
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

export const appendAssistantMessage = mutation({
  args: {
    threadId: v.id("threads"),
    content: v.string(),
    model: v.string(),
    tokenUsage: v.optional(
      v.object({
        prompt: v.number(),
        completion: v.number(),
        total: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Update thread's updatedAt
    await ctx.db.patch(args.threadId, {
      updatedAt: Date.now(),
    });

    return await ctx.db.insert("messages", {
      threadId: args.threadId,
      role: "assistant",
      content: args.content,
      createdAt: Date.now(),
      model: args.model,
      tokenUsage: args.tokenUsage,
    });
  },
});

export const listMessages = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_thread_createdAt", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();
  },
});
