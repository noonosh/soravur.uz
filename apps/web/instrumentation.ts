// Next.js instrumentation hook. Sentry's Next SDK uses this to wire up
// the appropriate runtime config; we re-export its handler so server-
// and edge-runtime errors are captured automatically when SENTRY_DSN
// is configured.
import * as Sentry from "@sentry/nextjs";

export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		await import("./sentry.server.config");
	}
	if (process.env.NEXT_RUNTIME === "edge") {
		await import("./sentry.edge.config");
	}
}

export const onRequestError = Sentry.captureRequestError;
