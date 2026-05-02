import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
};

// Sentry's webpack plugin only kicks in when SENTRY_AUTH_TOKEN +
// SENTRY_ORG + SENTRY_PROJECT are set in the build env, so wrapping is
// safe for self-hosters without Sentry — the runtime SDK is also gated
// on NEXT_PUBLIC_SENTRY_DSN inside sentry.*.config.ts.
export default withSentryConfig(nextConfig, {
	silent: !process.env.SENTRY_AUTH_TOKEN,
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
	authToken: process.env.SENTRY_AUTH_TOKEN,
	disableLogger: true,
	telemetry: false,
});
