import { describe, expect, it } from "vitest";
import {
	buildConversationMessages,
	buildSystemPrompt,
	isSubject,
	SUBJECTS,
	type Subject,
} from "./prompts";

// Behavioural locks. The exact wording will evolve; these tests guard
// the *invariants* — anti-hallucination directive present, language
// lock present, and subject-specific markers that signal the right
// section was loaded.

describe("buildSystemPrompt", () => {
	for (const subject of SUBJECTS) {
		describe(`${subject}`, () => {
			const prompt = buildSystemPrompt(subject);

			it("locks output to Uzbek", () => {
				expect(prompt).toMatch(/FAQAT O'ZBEK TILIDA/);
			});

			it("includes anti-hallucination directive", () => {
				// The shared base instructs the model not to fabricate when
				// uncertain. A regression that drops this directive is the
				// single highest-cost prompt change we can make.
				expect(prompt.toLowerCase()).toMatch(/to'qima/);
				expect(prompt.toLowerCase()).toMatch(/aniq bilmay/);
			});

			it("refuses cheating help", () => {
				expect(prompt.toLowerCase()).toMatch(/aldamchili|javob kalit/);
			});

			it("is non-trivial in length", () => {
				// Cheap guard: an accidental empty section would slip past
				// stricter content checks otherwise.
				expect(prompt.length).toBeGreaterThan(400);
			});
		});
	}

	it("maths variant locks LaTeX usage", () => {
		const p = buildSystemPrompt("maths");
		expect(p).toMatch(/LaTeX/);
		// Single backslash in the prompt source — the test must match
		// one literal backslash, not two.
		expect(p).toMatch(/\\frac|\\sqrt|\\sum/);
	});

	it("literature variant forbids fabricating quotes", () => {
		const p = buildSystemPrompt("literature");
		// "iqtibos" = quotation. Forbidding fabrication of these is the
		// core of the literature anti-hallucination policy.
		expect(p.toLowerCase()).toMatch(/iqtibos/);
		expect(p.toLowerCase()).toMatch(/to'qima|to'qimang/);
		// Canonical Uzbek authors must be listed so the model has the
		// correct spellings anchored in its context.
		expect(p).toMatch(/Navoiy/);
		expect(p).toMatch(/Cho'lpon/);
	});

	it("programming variant requires complexity and language version info", () => {
		const p = buildSystemPrompt("programming");
		expect(p.toLowerCase()).toMatch(/big-o|murakkab/);
		expect(p.toLowerCase()).toMatch(/versiya/);
	});

	it("does not bleed one subject's section into another", () => {
		const maths = buildSystemPrompt("maths");
		const lit = buildSystemPrompt("literature");
		const prog = buildSystemPrompt("programming");

		// Literature shouldn't carry a Big-O directive.
		expect(lit.toLowerCase()).not.toMatch(/big-o/);
		// Programming shouldn't carry a "tashbeh / istiora" (literary
		// devices) directive — those belong to literature only.
		expect(prog.toLowerCase()).not.toMatch(/tashbeh|istiora/);
		// Programming shouldn't list canonical Uzbek literary authors.
		expect(prog).not.toMatch(/Navoiy|Cho'lpon|Qodiriy/);
		// Maths shouldn't carry the canonical-author list either —
		// "iqtibos" itself appears in the shared base (as an
		// anti-fabrication target across all subjects), so the marker
		// has to be literature-only canon.
		expect(maths).not.toMatch(/Navoiy|Cho'lpon|Qodiriy/);
	});
});

describe("isSubject", () => {
	it("accepts canonical subjects", () => {
		for (const s of SUBJECTS) expect(isSubject(s)).toBe(true);
	});
	it("rejects unknown strings and non-strings", () => {
		expect(isSubject("history")).toBe(false);
		expect(isSubject("")).toBe(false);
		expect(isSubject(undefined)).toBe(false);
		expect(isSubject(null)).toBe(false);
		expect(isSubject(42)).toBe(false);
	});
});

// Exhaustiveness guard: if anyone adds a new Subject without a
// section, this catches it at type-check time AND at runtime.
describe("SUBJECTS coverage", () => {
	it("buildSystemPrompt handles every Subject", () => {
		const seen = new Set<string>();
		for (const s of SUBJECTS) {
			const p = buildSystemPrompt(s as Subject);
			expect(p.length).toBeGreaterThan(0);
			seen.add(s);
		}
		expect(seen.size).toBe(SUBJECTS.length);
	});
});

// The action's only job around prompts is to call
// buildConversationMessages(subject, ...). These tests lock that
// wiring: a refactor that hardcodes the subject (or drops the prefix
// system message entirely) breaks them.
describe("buildConversationMessages", () => {
	it("prefixes the conversation with a subject-specific system message", () => {
		const lit = buildConversationMessages("literature", [
			{ role: "user", content: "Cho'lpon haqida gapirib bering" },
		]);
		expect(lit).toHaveLength(2);
		expect(lit[0].role).toBe("system");
		expect(lit[0].content).toMatch(/Navoiy/);
		expect(lit[1]).toEqual({
			role: "user",
			content: "Cho'lpon haqida gapirib bering",
		});

		const maths = buildConversationMessages("maths", []);
		expect(maths[0].content).toMatch(/LaTeX/);
		expect(maths[0].content).not.toMatch(/Navoiy/);
	});

	it("drops stored system messages from the history", () => {
		// We craft the system prompt ourselves; any system rows that
		// somehow leaked into the messages table must not be re-sent
		// (they could leak a stale prompt across sessions).
		const out = buildConversationMessages("maths", [
			{ role: "system", content: "STALE SYSTEM" },
			{ role: "user", content: "Salom" },
		]);
		expect(out).toHaveLength(2);
		expect(out[1]).toEqual({ role: "user", content: "Salom" });
		expect(out.some((m) => m.content === "STALE SYSTEM")).toBe(false);
	});

	it("preserves user/assistant order", () => {
		const out = buildConversationMessages("programming", [
			{ role: "user", content: "U1" },
			{ role: "assistant", content: "A1" },
			{ role: "user", content: "U2" },
		]);
		expect(out.map((m) => m.role)).toEqual([
			"system",
			"user",
			"assistant",
			"user",
		]);
		expect(out.slice(1).map((m) => m.content)).toEqual(["U1", "A1", "U2"]);
	});
});
