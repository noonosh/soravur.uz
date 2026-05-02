import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

// Covers the listThreads view filter + archive/unarchive round-trip.
// The auth-bound queries are exercised in users.test.ts; here we use
// raw mutations against a freshly-inserted user row.

// @ts-expect-error vite-only API; available at test runtime.
const modules = import.meta.glob("./**/*.{ts,js}");

async function makeUser(t: ReturnType<typeof convexTest>) {
	return t.run(async (ctx) =>
		ctx.db.insert("users", {
			authSubject: "test-subject",
			displayName: "Test",
			createdAt: Date.now(),
		}),
	);
}

describe("threads.listThreads view filter", () => {
	it("returns only active threads when view is omitted (default)", async () => {
		const t = convexTest(schema, modules);
		const userId = await makeUser(t);
		const aId = await t.mutation(api.threads.createThread, {
			userId,
			title: "Active",
		});
		const bId = await t.mutation(api.threads.createThread, {
			userId,
			title: "Archived",
		});
		await t.mutation(api.threads.archiveThread, { threadId: bId });

		const result = await t.query(api.threads.listThreads, { userId });
		expect(result).toHaveLength(1);
		expect(result[0]._id).toBe(aId);
	});

	it("returns only archived threads when view is 'archived'", async () => {
		const t = convexTest(schema, modules);
		const userId = await makeUser(t);
		await t.mutation(api.threads.createThread, { userId, title: "Active" });
		const bId = await t.mutation(api.threads.createThread, {
			userId,
			title: "Archived",
		});
		await t.mutation(api.threads.archiveThread, { threadId: bId });

		const archived = await t.query(api.threads.listThreads, {
			userId,
			view: "archived",
		});
		expect(archived).toHaveLength(1);
		expect(archived[0]._id).toBe(bId);
	});

	it("orders threads newest-first", async () => {
		const t = convexTest(schema, modules);
		const userId = await makeUser(t);
		const oldId = await t.mutation(api.threads.createThread, {
			userId,
			title: "Old",
		});
		await new Promise((resolve) => setTimeout(resolve, 5));
		const newId = await t.mutation(api.threads.createThread, {
			userId,
			title: "New",
		});

		const list = await t.query(api.threads.listThreads, { userId });
		expect(list[0]._id).toBe(newId);
		expect(list[1]._id).toBe(oldId);
	});

	it("unarchive moves a thread back into the active view", async () => {
		const t = convexTest(schema, modules);
		const userId = await makeUser(t);
		const id = await t.mutation(api.threads.createThread, {
			userId,
			title: "Round-trip",
		});
		await t.mutation(api.threads.archiveThread, { threadId: id });
		expect(
			await t.query(api.threads.listThreads, { userId, view: "archived" }),
		).toHaveLength(1);

		await t.mutation(api.threads.unarchiveThread, { threadId: id });
		expect(
			await t.query(api.threads.listThreads, { userId, view: "archived" }),
		).toHaveLength(0);
		expect(await t.query(api.threads.listThreads, { userId })).toHaveLength(1);
	});

	it("refuses to create a thread for a soft-deleted user", async () => {
		const t = convexTest(schema, modules);
		const userId = await makeUser(t);
		await t.run(async (ctx) =>
			ctx.db.patch(userId, { isDeleted: true, deletedAt: Date.now() }),
		);

		await expect(
			t.mutation(api.threads.createThread, { userId, title: "Nope" }),
		).rejects.toThrow(/User not available/);
	});
});
