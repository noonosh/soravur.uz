import { defineConfig } from "vitest/config";

// convex-test runs Convex functions inside an edge-runtime sandbox.
// inline: ["convex-test"] is required so vitest serves the package
// pre-bundled (its imports of convex internals are not friendly to
// dependency hoisting under the bun isolated linker).
//
// setupFiles patches convex/values to add getConvexSize / getDocumentSize
// when convex-test 0.0.51 expects them but convex 1.31.x doesn't yet
// export them. See test/setup.ts.
export default defineConfig({
	test: {
		environment: "edge-runtime",
		setupFiles: ["./test/setup.ts"],
		server: {
			deps: {
				inline: ["convex-test"],
			},
		},
		include: ["convex/**/*.test.ts"],
	},
});
