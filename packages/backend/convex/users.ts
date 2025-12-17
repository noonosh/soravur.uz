import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const upsertUserFromIdentity = mutation({
  args: {
    authSubject: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_auth_subject", (q) =>
        q.eq("authSubject", args.authSubject)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("users", {
      authSubject: args.authSubject,
      displayName: args.displayName,
      createdAt: Date.now(),
    });
  },
});

export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_auth_subject", (q) =>
        q.eq("authSubject", identity.subject)
      )
      .unique();
  },
});

export const ensureCurrentUserProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_auth_subject", (q) =>
        q.eq("authSubject", identity.subject)
      )
      .unique();

    if (existing) {
      return existing;
    }

    // Create new user profile
    const userId = await ctx.db.insert("users", {
      authSubject: identity.subject,
      displayName: identity.name || identity.email || "User",
      createdAt: Date.now(),
    });

    return await ctx.db.get(userId);
  },
});
