// Bridges a version-skew bug between convex-test 0.0.51 (which
// imports getConvexSize / getDocumentSize from "convex/values") and
// convex 1.31.x (which doesn't yet export them). vi.mock is hoisted
// to the top of the file and runs before convex-test imports the
// module, so the missing names are filled in with zero-cost stubs.
//
// Size accounting is purely informational under convex-test — tests
// don't assert against tracked bytes — so a constant 0 is safe.
import { vi } from "vitest";

vi.mock("convex/values", async () => {
	const actual = await vi.importActual<Record<string, unknown>>(
		"convex/values",
	);
	return {
		...actual,
		getConvexSize:
			(actual.getConvexSize as ((value: unknown) => number) | undefined) ??
			((_value: unknown) => 0),
		getDocumentSize:
			(actual.getDocumentSize as ((value: unknown) => number) | undefined) ??
			((_value: unknown) => 0),
	};
});
