import { describe, expect, it } from "vitest";
import { SUBJECTS } from "@soravur/backend/convex/prompts";
import models from "../../../../models.json";

// Sync guard: the Subject union in the backend MUST match the model
// ids in models.json. The frontend dropdown reads models.json; the
// backend prompt selector reads SUBJECTS. If these drift, the wrong
// system prompt fires (or worse, the action validator rejects valid
// requests). This test catches that at CI time, before deploy.

describe("subject ↔ models.json sync", () => {
	it("models.json ids match the backend SUBJECTS union", () => {
		const jsonIds = models.models.map((m) => m.id).sort();
		const subjectIds = [...SUBJECTS].sort();
		expect(jsonIds).toEqual(subjectIds);
	});
});
