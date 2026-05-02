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

// Streaming primitives. The chat action inserts an empty assistant
// message up front, then patches its content as deltas arrive — the
// frontend's reactive useQuery on listMessages re-renders for free.

export const startAssistantMessage = mutation({
  args: {
    threadId: v.id("threads"),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, { updatedAt: Date.now() });
    return await ctx.db.insert("messages", {
      threadId: args.threadId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      model: args.model,
    });
  },
});

export const patchAssistantContent = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    tokenUsage: v.optional(
      v.object({
        prompt: v.number(),
        completion: v.number(),
        total: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const patch: {
      content: string;
      tokenUsage?: { prompt: number; completion: number; total: number };
    } = { content: args.content };
    if (args.tokenUsage) patch.tokenUsage = args.tokenUsage;
    await ctx.db.patch(args.messageId, patch);
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
