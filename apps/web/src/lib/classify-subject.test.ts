import { describe, expect, it } from "vitest";
import { classifySubject } from "./classify-subject";

describe("classifySubject — maths", () => {
	it("'geometrik progressiya nima' → maths", () => {
		expect(classifySubject("geometrik progressiya nima")).toBe("maths");
	});

	it("Pifagor teoremasi prompt → maths", () => {
		expect(
			classifySubject("Geometriyada Pifagor teoremasi qanday isbotlanadi?"),
		).toBe("maths");
	});

	it("trigonometry prompt → maths", () => {
		expect(
			classifySubject(
				"Trigonometriyada sinus va kosinus orasidagi farq nimada?",
			),
		).toBe("maths");
	});

	it("logarithm prompt → maths", () => {
		expect(
			classifySubject("Logarifmlarning asosiy xossalarini tushuntiring."),
		).toBe("maths");
	});

	it("quadratic equation prompt → maths", () => {
		expect(classifySubject("Kvadrat tenglamani qanday yechish mumkin?")).toBe(
			"maths",
		);
	});
});

describe("classifySubject — literature", () => {
	it("Cho'lpon poetry → literature", () => {
		expect(
			classifySubject("Cho'lpon she'riyatining asosiy mavzulari nimalardan?"),
		).toBe("literature");
	});

	it("Qodiriy roman → literature", () => {
		expect(
			classifySubject('Abdulla Qodiriyning "O‘tkan kunlar" romani nima haqida?'),
		).toBe("literature");
	});

	it("Oybek roman → literature", () => {
		expect(
			classifySubject('Oybekning "Qutlug‘ qon" romani qaysi davrni aks ettiradi?'),
		).toBe("literature");
	});
});

describe("classifySubject — programming", () => {
	it("React hooks prompt → programming", () => {
		expect(
			classifySubject("React'da useState va useEffect orasidagi farq nimada?"),
		).toBe("programming");
	});

	it("REST vs GraphQL → programming", () => {
		expect(classifySubject("REST API va GraphQL orasidagi farqlar qaysilar?")).toBe(
			"programming",
		);
	});

	it("recursion in Uzbek → programming", () => {
		expect(classifySubject("Rekursiya nima va qachon ishlatiladi?")).toBe(
			"programming",
		);
	});
});

describe("classifySubject — null on ambiguous", () => {
	it("returns null on too-short input", () => {
		expect(classifySubject("salom")).toBe(null);
	});

	it("returns null when no subject keywords match", () => {
		expect(classifySubject("Bugun ob-havo qanday?")).toBe(null);
	});
});
