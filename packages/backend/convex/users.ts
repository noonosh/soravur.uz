import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { accountDeletedEmail, getEmailSender, type EmailSender } from "./email";

// Soft-delete is the v1 deletion model. We refuse to materialise a
// profile (or return an existing one) when isDeleted is true so the
// user effectively cannot use the app even if better-auth still has
// their session.

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

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_subject", (q) =>
        q.eq("authSubject", identity.subject)
      )
      .unique();

    if (!user) return null;
    if (user.isDeleted) return null;
    return user;
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
      // A previously-deleted user must not be revived silently.
      if (existing.isDeleted) {
        throw new Error("Account deleted");
      }
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

export const updateProfile = mutation({
  args: {
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.displayName.trim();
    if (trimmed.length < 2) {
      throw new Error("Ism kamida 2 ta belgidan iborat bo'lsin");
    }
    if (trimmed.length > 60) {
      throw new Error("Ism juda uzun (maksimum 60 belgi)");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_subject", (q) =>
        q.eq("authSubject", identity.subject)
      )
      .unique();
    if (!user || user.isDeleted) throw new Error("Not authenticated");

    await ctx.db.patch(user._id, { displayName: trimmed });
    return await ctx.db.get(user._id);
  },
});

// Marks user as deleted. Internal mutation — clients call the
// softDeleteAccount action which both flips the flag and sends the
// confirmation email. Splitting them keeps the email side-effect out
// of the mutation runtime (which has no fetch).
export const markUserDeleted = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_subject", (q) =>
        q.eq("authSubject", identity.subject)
      )
      .unique();
    if (!user) throw new Error("Not authenticated");
    if (user.isDeleted) {
      // Idempotent — return the email/name we'd notify even on a repeat
      // call so the action can short-circuit without erroring.
      return {
        email: identity.email ?? null,
        name: user.displayName ?? null,
        alreadyDeleted: true,
      };
    }

    const now = Date.now();
    await ctx.db.patch(user._id, { isDeleted: true, deletedAt: now });

    return {
      email: identity.email ?? null,
      name: user.displayName ?? null,
      alreadyDeleted: false,
    };
  },
});

let injectedSender: EmailSender | null = null;
// Test seam — same shape as auth.ts. Mirrored here so users.ts tests
// don't have to reach across modules.
export function setEmailSenderForUsers(sender: EmailSender | null) {
  injectedSender = sender;
}

export const softDeleteAccount = action({
  args: {},
  handler: async (ctx): Promise<{ ok: true }> => {
    const result = await ctx.runMutation(api.users.markUserDeleted, {});
    if (!result.alreadyDeleted && result.email) {
      const sender = injectedSender ?? getEmailSender();
      await sender.send(
        accountDeletedEmail({
          to: result.email,
          displayName: result.name ?? undefined,
        }),
      );
    }
    return { ok: true };
  },
});
