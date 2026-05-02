import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    authSubject: v.string(),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_auth_subject", ["authSubject"]),

  threads: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    isArchived: v.optional(v.boolean()),
  }).index("by_user_updatedAt", ["userId", "updatedAt"]),

  messages: defineTable({
    threadId: v.id("threads"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
    createdAt: v.number(),
    model: v.optional(v.string()),
    tokenUsage: v.optional(
      v.object({
        prompt: v.number(),
        completion: v.number(),
        total: v.number(),
      })
    ),
  }).index("by_thread_createdAt", ["threadId", "createdAt"]),

  rateLimits: defineTable({
    userId: v.id("users"),
    windowKey: v.string(),
    windowStart: v.number(),
    count: v.number(),
    updatedAt: v.number(),
  }).index("by_user_window", ["userId", "windowKey"]),

  usageEvents: defineTable({
    userId: v.id("users"),
    threadId: v.id("threads"),
    requestId: v.string(),
    model: v.string(),
    createdAt: v.number(),
    tokensTotal: v.optional(v.number()),
    costEstimateUsd: v.optional(v.number()),
  })
    .index("by_user_createdAt", ["userId", "createdAt"])
    .index("by_createdAt", ["createdAt"])
    .index("by_request", ["requestId"]),
});
