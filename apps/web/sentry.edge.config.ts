// Sentry initialization for the Next.js Edge runtime (middleware,
// edge route handlers).
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
	Sentry.init({
		dsn,
		environment: process.env.SENTRY_ENV || process.env.NODE_ENV,
		tracesSampleRate: Number(
			process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1",
		),
	});
}
