import { describe, expect, it } from "vitest";
import { isLikelyUzbek } from "./openrouter";

describe("isLikelyUzbek — accepts", () => {
	it("preset literature prompt with U+2018 left-single-quote", () => {
		expect(
			isLikelyUzbek(
				'Oybekning "Qutlug‘ qon" romani qaysi davrni aks ettiradi?',
			),
		).toBe(true);
	});

	it("preset literature prompt with curly typographic quotes around title", () => {
		expect(
			isLikelyUzbek(
				"Abdulla Qodiriyning “O‘tkan kunlar” romani nima haqida?",
			),
		).toBe(true);
	});

	it("preset maths prompt", () => {
		expect(
			isLikelyUzbek("Kvadrat tenglamani qanday yechish mumkin?"),
		).toBe(true);
	});

	it("preset programming prompt", () => {
		expect(
			isLikelyUzbek("React'da useState va useEffect orasidagi farq nimada?"),
		).toBe(true);
	});

	it("Cyrillic Uzbek prompt", () => {
		expect(
			isLikelyUzbek("Ўзбек тилида қандай ёзиш керак?"),
		).toBe(true);
	});

	it("short message bypasses heuristic", () => {
		expect(isLikelyUzbek("ha")).toBe(true);
		expect(isLikelyUzbek("yo'q")).toBe(true);
	});

	it("math-heavy input bypasses heuristic", () => {
		expect(isLikelyUzbek("2x + 3 = 7, x = ?")).toBe(true);
	});

	it("ambiguous text without strong English markers passes", () => {
		// No function words from either side, no Cyrillic — earlier
		// version rejected this; relaxed version accepts.
		expect(isLikelyUzbek("Pifagor teoremasi geometriya")).toBe(true);
	});
});

describe("isLikelyUzbek — rejects", () => {
	it("English sentence", () => {
		expect(
			isLikelyUzbek("Please explain what the Pythagorean theorem is and how"),
		).toBe(false);
	});

	it("Russian sentence with Russian-only letters", () => {
		expect(
			isLikelyUzbek(
				"Объясните, пожалуйста, как решать квадратные уравнения в школе",
			),
		).toBe(false);
	});

	it("empty string", () => {
		expect(isLikelyUzbek("")).toBe(false);
	});
});
