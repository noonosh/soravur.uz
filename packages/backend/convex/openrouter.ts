export const OPENROUTER_API_URL =
  "https://openrouter.ai/api/v1/chat/completions";

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatCompletionMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatCompletionMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenRouter API key is required");
    }
    this.apiKey = apiKey;
  }

  async createChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.SITE_URL || "https://soravur.com",
          "X-Title": "Soravur Exam Helper",
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      return response.json() as Promise<ChatCompletionResponse>;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout - model took too long to respond");
      }
      throw error;
    }
  }
}

// Uzbek language detection (basic heuristic).
//
// The goal is to reject obviously English/Russian/etc. messages, NOT to
// gate every short or formula-heavy input. We bypass the heuristic when
// the message is too short or too non-linguistic to make a reliable
// judgement (math, code, mostly digits/symbols), and we additionally
// reject when we see strong signals of another language (Cyrillic
// letters that aren't in the Uzbek alphabet, dense English function
// words, etc.).
export function isLikelyUzbek(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return false;

  // Bypass: very short messages — language detection on <12 chars is
  // unreliable, and short clarifications ("ha", "yo'q", "ok", "1+1=?")
  // shouldn't be blocked.
  if (t.length < 12) return true;

  // Bypass: math/code-heavy messages where letters are a minority.
  // We only count alphabetic characters as "linguistic"; if fewer than
  // 40% of the message is letters, treat it as non-linguistic input.
  const letterCount = (t.match(/\p{L}/gu) || []).length;
  if (letterCount / t.length < 0.4) return true;

  // Bypass: contains a fenced code block or LaTeX block — clearly not
  // a normal-prose message.
  if (/```|\$\$/.test(t)) return true;

  // Strong reject: non-Uzbek Cyrillic letters (Russian-only letters)
  // dominate. Uzbek Cyrillic uses ў, ғ, ҳ, қ; Russian-specific letters
  // like ы, э, ъ, ь are not part of standard Uzbek Cyrillic.
  const russianOnlyLetters = (t.match(/[ыэъь]/gi) || []).length;
  if (russianOnlyLetters >= 2) return false;

  // Uzbek Cyrillic-specific letters
  const cyrillicUzbekLetters = /[ўғҳқ]/i;

  // Uzbek Latin: apostrophe variants + digraphs often used in Uzbek
  const latinUzbekPatterns = /(o['’ʻ]?\s?z|o['’ʻ]|g['’ʻ]|sh|ch|yo|yu|ya)/i;

  // Common Uzbek function words (Latin + Cyrillic)
  const uzbekWords =
    /\b(va|bilan|uchun|agar|lekin|siz|men|bu|u|ular|biz|bizning|sizning|qanday|nima|nega|qachon|qayerda|kim|shunday|har|hamma|yoki|chunki|shuning|keyin|oldin|hozir|bugun|kecha|ertaga|vaqt|masala|yechim|tushuntir|izoh)\b/i;
  const uzbekWordsCyrillic =
    /\b(ва|билан|учун|агар|лекин|сиз|мен|бу|у|улар|биз|бизнинг|сизнинг|қандай|нима|нега|қачон|қаерда|ким|шундай|ҳар|ҳамма|ёки|чунки|шунинг|кейин|олдин|ҳозир|бугун|кеча|эртага)\b/i;

  return (
    cyrillicUzbekLetters.test(t) ||
    latinUzbekPatterns.test(t) ||
    uzbekWords.test(t) ||
    uzbekWordsCyrillic.test(t)
  );
}

// System prompt for Uzbek-only exam helper
export function buildSystemPrompt(): string {
  return `Siz O'zbekiston talabalariga imtihonlarga tayyorgarlik ko'rishda yordam beradigan AI yordamchisiz.

MUHIM QOIDALAR:
1. FAQAT O'ZBEK TILIDA javob bering. Boshqa tillarni ishlatmang.
2. Javoblaringizni sodda va tushunarli qilib bering.
3. Qadam-baqadam tushuntiring.
4. Matematika va fan masalalarida formulalar va misollar keltiring.
5. Talabaning bilim darajasiga mos javob bering.
6. Imtihon aldamchiligiga yordam bermang, o'rganishga yo'naltiring.

FORMATLASH QOIDALARI:
- Markdown formatidan foydalaning
- Sarlavhalar uchun ### ishlatining
- Ro'yxatlar uchun - yoki 1. 2. 3. formatdan foydalaning
- Muhim so'zlarni **qalin** qiling
- Matematik formulalar uchun LaTeX formatidan foydalaning:
  * Inline matematik ifodalar uchun $...$ (masalan: $x^2 + y^2 = r^2$)
  * Blok/displey matematik ifodalar uchun $$...$$ (alohida qatorda)
  * Formulalarni to'liq LaTeX sintaksisida yozing (\\frac, \\sqrt, \\sum, \\int, va h.k.)
- Kod uchun \`kod\` yoki ko'p qatorli kod uchun \`\`\` ishlatining

JAVOB STRUKTURASI:
### Asosiy javob
[Tushuntirish]

### Qadamlar
1. Birinchi qadam
2. Ikkinchi qadam
3. ...

### Asosiy tushunchalar
- **Tushuncha 1**: Tushuntirish
- **Tushuncha 2**: Tushuntirish

### Ko'p uchraydigan xatolar
- Xato 1 va tushuntirish
- Xato 2 va tushuntirish

### Tekshirish
[Tekshirish usullari]`;
}

// Format assistant response
export interface AssistantResponse {
  answer: string;
  steps?: string[];
  keyConcepts?: string[];
  commonMistakes?: string[];
  finalCheck?: string;
}

export function parseAssistantResponse(content: string): AssistantResponse {
  // Try to parse JSON structure if present
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AssistantResponse;
    }
  } catch {
    // If JSON parsing fails, return as plain answer
  }

  return {
    answer: content,
  };
}
