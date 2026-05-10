import type { ModelType } from "@/components/model-selector";

// Lightweight keyword classifier — runs in the browser on every send,
// no LLM round-trip. Good enough for the obvious cases (the dropdown
// and the message subject diverging because the user forgot to switch
// after picking a starter prompt or starting a fresh thread).
//
// Each list intentionally favours subject-specific terms over generic
// vocabulary. A two-character apostrophe class lets curly/typographic
// quotes match too — "she'r", "she‘r", "she’r", "sheʻr" all hit the
// same entry.

const APOS = "['‘’ʻ]"; // ' ‘ ’ ʻ

// Compiles a list of terms into a single anchored prefix-match regex.
// Uses lookbehind so the left boundary doesn't consume characters
// (otherwise adjacent matches like "Pifagor teoremasi" share the
// boundary and the second one is missed). No right boundary — Uzbek
// is agglutinative, so "Oybekning", "Oybekni", "romani" should all
// match their stems "oybek", "roman".
function buildPattern(terms: string[]): RegExp {
	const escaped = terms.map((t) =>
		t
			.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
			.replace(/['‘’ʻ]/g, APOS),
	);
	return new RegExp(`(?<=^|\\P{L})(?:${escaped.join("|")})`, "giu");
}

const MATHS_TERMS = [
	// Uzbek + Cyrillic
	"matematika",
	"математика",
	"algebra",
	"алгебра",
	"geometriya",
	"геометрия",
	"geometrik",
	"геометрик",
	"trigonometriya",
	"тригонометрия",
	"sinus",
	"синус",
	"kosinus",
	"косинус",
	"tangens",
	"тангенс",
	"kotangens",
	"котангенс",
	"logarifm",
	"логарифм",
	"hosila",
	"ҳосила",
	"integral",
	"tenglama",
	"тенглама",
	"tengsizlik",
	"funksiya",
	"функция",
	"daraja",
	"даража",
	"ildiz",
	"илдиз",
	"matritsa",
	"матрица",
	"vektor",
	"вектор",
	"progressiya",
	"прогрессия",
	"arifmetik",
	"арифметик",
	"ehtimol",
	"эҳтимол",
	"ehtimollar",
	"statistika",
	"статистика",
	"teorema",
	"теорема",
	"teoremasi",
	"isbot",
	"исбот",
	"pifagor",
	"пифагор",
	"kvadrat",
	"квадрат",
	"kub",
	"куб",
	"uchburchak",
	"учбурчак",
	"to'rtburchak",
	"тўртбурчак",
	"doira",
	"доира",
	"aylana",
	"айлана",
	"diametr",
	"диаметр",
	"radius",
	"радиус",
	"perimetr",
	"периметр",
	"yuza",
	"юза",
	"hajm",
	"ҳажм",
	"burchak",
	"бурчак",
	"son",
	"сон",
	"sonlar",
	"butun",
	"kasr",
	"каср",
	"foiz",
	"фоиз",
	"yechim",
	"ечим",
	"yeching",
	"hisobla",
	"ҳисобла",
	"hisoblash",
	"formula",
	"формула",
	"masala",
	"масала",
];

const LITERATURE_TERMS = [
	"adabiyot",
	"адабиёт",
	"she'r",
	"шеър",
	"sheriyat",
	"шеърият",
	"roman",
	"роман",
	"hikoya",
	"ҳикоя",
	"qissa",
	"қисса",
	"doston",
	"достон",
	"qasida",
	"қасида",
	"g'azal",
	"ғазал",
	"masal",
	"масал",
	"asar",
	"асар",
	"asari",
	"yozuvchi",
	"ёзувчи",
	"shoir",
	"шоир",
	"shoira",
	"шоира",
	"ijod",
	"ижод",
	"badiiy",
	"бадиий",
	"qahramon",
	"қаҳрамон",
	"syujet",
	"сюжет",
	"obraz",
	"образ",
	"navoiy",
	"навоий",
	"qodiriy",
	"қодирий",
	"oybek",
	"ойбек",
	"cho'lpon",
	"чўлпон",
	"zulfiya",
	"зулфия",
	"olimjon",
	"олимжон",
	"g'ulom",
	"ғулом",
	"vohidov",
	"воҳидов",
	"tilshunoslik",
	"тилшунослик",
	"morfologiya",
	"морфология",
	"sintaksis",
	"синтаксис",
	"fonetika",
	"фонетика",
];

const PROGRAMMING_TERMS = [
	"dasturlash",
	"дастурлаш",
	"dasturchi",
	"дастурчи",
	"kod",
	"код",
	"kodlash",
	"javascript",
	"typescript",
	"python",
	"java",
	"react",
	"vue",
	"angular",
	"node",
	"nodejs",
	"deno",
	"bun",
	"npm",
	"yarn",
	"html",
	"css",
	"tailwind",
	"sql",
	"nosql",
	"postgres",
	"mongodb",
	"redis",
	"api",
	"rest",
	"graphql",
	"json",
	"xml",
	"yaml",
	"http",
	"https",
	"websocket",
	"function",
	"funksiya",
	"class",
	"klass",
	"variable",
	"o'zgaruvchi",
	"loop",
	"sikl",
	"recursion",
	"rekursiya",
	"рекурсия",
	"async",
	"await",
	"promise",
	"server",
	"сервер",
	"client",
	"клиент",
	"database",
	"маълумотлар",
	"frontend",
	"backend",
	"fullstack",
	"git",
	"github",
	"gitlab",
	"docker",
	"kubernetes",
	"terminal",
	"shell",
	"bash",
	"useState",
	"useEffect",
	"useMemo",
	"useRef",
	"component",
	"komponent",
	"компонент",
	"algoritm",
	"алгоритм",
	"struktura",
	"структура",
	"obyekt",
	"объект",
	"massiv",
	"массив",
	"satr",
	"сатр",
	"string",
];

const PATTERNS: Record<ModelType, RegExp> = {
	maths: buildPattern(MATHS_TERMS),
	literature: buildPattern(LITERATURE_TERMS),
	programming: buildPattern(PROGRAMMING_TERMS),
};

function countMatches(re: RegExp, text: string): number {
	// Pattern is already global (built with "giu"). Reset lastIndex
	// before scanning so repeat callers don't share state.
	re.lastIndex = 0;
	return (text.match(re) || []).length;
}

// Returns the inferred subject when one wins clearly, null otherwise.
// "Clearly" = at least one keyword hit AND a strict lead over the
// runner-up (>= 1 more match). Ambiguous tie → return null so the
// caller keeps the user's current selection.
export function classifySubject(text: string): ModelType | null {
	const t = text.trim();
	if (t.length < 4) return null;

	const scores: Record<ModelType, number> = {
		maths: countMatches(PATTERNS.maths, t),
		literature: countMatches(PATTERNS.literature, t),
		programming: countMatches(PATTERNS.programming, t),
	};

	const entries = (Object.keys(scores) as ModelType[]).map((k) => ({
		subject: k,
		score: scores[k],
	}));
	entries.sort((a, b) => b.score - a.score);

	const [first, second] = entries;
	if (first.score === 0) return null;
	if (first.score - second.score < 1) return null;
	return first.subject;
}
