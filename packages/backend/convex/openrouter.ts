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

export type StreamEvent =
  | { type: "delta"; text: string; id?: string }
  | { type: "usage"; usage: NonNullable<ChatCompletionResponse["usage"]>; id?: string }
  | { type: "done"; finishReason?: string; id?: string };

export class OpenRouterClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenRouter API key is required");
    }
    this.apiKey = apiKey;
  }

  async *createChatCompletionStream(
    request: ChatCompletionRequest
  ): AsyncGenerator<StreamEvent, void, void> {
    const controller = new AbortController();
    // Longer timeout for streamed responses — OpenRouter holds the
    // connection open while the model generates.
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "HTTP-Referer": process.env.SITE_URL || "https://soravur.uz",
          "X-Title": "Soravur Exam Helper",
        },
        body: JSON.stringify({
          ...request,
          stream: true,
          // Ask OpenRouter to include a final usage event in the stream
          // so we can log token totals without a second request.
          stream_options: { include_usage: true },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }
      if (!response.body) {
        throw new Error("OpenRouter stream missing response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by blank lines. Hold the trailing
        // partial event in `buffer` and process complete ones.
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const raw of events) {
          // An event can have multiple lines; we only care about the
          // first `data:` line. Comment lines (": ...") are heartbeats.
          const dataLine = raw
            .split("\n")
            .find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          const payload = dataLine.replace(/^data:\s*/, "").trim();
          if (!payload) continue;
          if (payload === "[DONE]") {
            yield { type: "done" };
            return;
          }
          let json: {
            id?: string;
            choices?: Array<{
              delta?: { content?: string };
              finish_reason?: string | null;
            }>;
            usage?: {
              prompt_tokens: number;
              completion_tokens: number;
              total_tokens: number;
            };
          };
          try {
            json = JSON.parse(payload);
          } catch {
            continue;
          }
          const delta = json.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            yield { type: "delta", text: delta, id: json.id };
          }
          if (json.usage) {
            yield { type: "usage", usage: json.usage, id: json.id };
          }
          const fr = json.choices?.[0]?.finish_reason;
          if (fr) {
            yield { type: "done", finishReason: fr, id: json.id };
            return;
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout - model took too long to respond");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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
          "HTTP-Referer": process.env.SITE_URL || "https://soravur.uz",
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
