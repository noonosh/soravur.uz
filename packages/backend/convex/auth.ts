import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { api, components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";
import { v } from "convex/values";
import {
	getEmailSender,
	verificationEmail,
	passwordResetEmail,
	type EmailSender,
} from "./email";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

// Per-target throttles for outbound auth emails. Independent from the
// per-IP better-auth limit so a single victim can't be email-bombed
// even if the attacker rotates IPs.
const RESET_PER_HOUR = 3;
const VERIFY_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

// Test seam: tests inject a CapturingEmailSender via setEmailSender();
// production reads the lazily-initialized default which respects
// RESEND_API_KEY at call time.
let injectedSender: EmailSender | null = null;
export function setEmailSender(sender: EmailSender | null) {
	injectedSender = sender;
}
function senderOrDefault(): EmailSender {
	return injectedSender ?? getEmailSender();
}

function createAuth(
	ctx: GenericCtx<DataModel>,
	{ optionsOnly }: { optionsOnly?: boolean } = { optionsOnly: false },
) {
	return betterAuth({
		logger: {
			disabled: optionsOnly,
		},
		baseURL: siteUrl,
		trustedOrigins: [siteUrl],
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: true,
			// Require verified email before sign-in. Without this a single
			// throwaway address can spawn unlimited paid OpenRouter calls.
			requireEmailVerification: true,
			sendResetPassword: async ({ user, url }) => {
				if (optionsOnly) return;
				// At runtime this fires from an HTTP/action context which
				// has runMutation; the type union also includes QueryCtx
				// (used during options-only introspection) so we narrow.
				if ("runMutation" in ctx) {
					await ctx.runMutation(api.emailThrottle.checkAndIncrement, {
						targetEmail: user.email,
						kind: "reset",
						limit: RESET_PER_HOUR,
						windowMs: HOUR_MS,
					});
				}
				await senderOrDefault().send(
					passwordResetEmail({
						to: user.email,
						url,
						displayName: user.name,
					}),
				);
			},
		},
		emailVerification: {
			sendOnSignUp: true,
			autoSignInAfterVerification: true,
			sendVerificationEmail: async ({ user, url }) => {
				if (optionsOnly) return;
				if ("runMutation" in ctx) {
					await ctx.runMutation(api.emailThrottle.checkAndIncrement, {
						targetEmail: user.email,
						kind: "verify",
						limit: VERIFY_PER_HOUR,
						windowMs: HOUR_MS,
					});
				}
				await senderOrDefault().send(
					verificationEmail({
						to: user.email,
						url,
						displayName: user.name,
					}),
				);
			},
		},
		// Throttle abusive auth traffic at the framework level.
		// IMPORTANT: storage must be "database" — the better-auth
		// default is in-memory, which is a no-op on Convex because
		// requests are served by transient containers, so per-process
		// counters never accumulate. Routing the counter through the
		// adapter persists it in Convex and makes the limits actually
		// enforced. Per-route overrides catch the high-cost endpoints.
		rateLimit: {
			enabled: true,
			storage: "database",
			window: 60,
			max: 30,
			customRules: {
				"/sign-up/email": { window: 60 * 60, max: 5 },
				"/sign-in/email": { window: 60, max: 10 },
				"/forget-password": { window: 60 * 60, max: 5 },
				"/reset-password": { window: 60 * 60, max: 10 },
				"/verify-email": { window: 60 * 60, max: 20 },
				"/send-verification-email": { window: 60 * 60, max: 5 },
			},
		},
		plugins: [convex()],
	});
}

export { createAuth };

export const getCurrentUser = query({
	args: {},
	returns: v.any(),
	handler: async function (ctx, _args) {
		return authComponent.getAuthUser(ctx);
	},
});
