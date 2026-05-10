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
// Default stance: ACCEPT unless we have strong evidence the text is
// English or Russian. The previous version required positive Uzbek
// signals which produced false rejections on legitimate prompts that
// happened to use only nouns/verbs outside the small function-word
// list (e.g. literary titles like "Oybekning Qutlug‘ qon romani").
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

  // Positive Uzbek signals — when present, accept regardless of
  // what else is in the text.
  // Apostrophe class includes ASCII ', U+2018 ‘ , U+2019 ’ , U+02BB ʻ.
  const APOS = "['‘’ʻ]";
  const cyrillicUzbekLetters = /[ўғҳқ]/i;
  const latinUzbekPatterns = new RegExp(
    `(o${APOS}?\\s?z|o${APOS}|g${APOS}|sh|ch|yo|yu|ya)`,
    "i"
  );
  const uzbekWords =
    /\b(va|bilan|uchun|agar|lekin|siz|men|bu|u|ular|biz|bizning|sizning|qanday|qaysi|qancha|qanaqa|nima|nega|nimaga|nechta|qachon|qayerda|qayer|kim|shunday|shu|har|hamma|barcha|yoki|chunki|shuning|keyin|oldin|hozir|bugun|kecha|ertaga|vaqt|kun|yil|oy|masala|yechim|tushuntir|izoh|kabi|faqat|juda|aks|ham|emas|edi|degan|haqida|o[‘’ʻ']rta|to[‘’ʻ']g[‘’ʻ']ri|ko[‘’ʻ']rsat|aytib|bering|romani|she[‘’ʻ']r|adabiyot|matematika|tarix|fan)\b/i;
  const uzbekWordsCyrillic =
    /\b(ва|билан|учун|агар|лекин|сиз|мен|бу|у|улар|биз|бизнинг|сизнинг|қандай|қайси|нима|нега|қачон|қаерда|ким|шундай|ҳар|ҳамма|ёки|чунки|шунинг|кейин|олдин|ҳозир|бугун|кеча|эртага|каби|фақат|жуда|акс)\b/i;

  if (
    cyrillicUzbekLetters.test(t) ||
    latinUzbekPatterns.test(t) ||
    uzbekWords.test(t) ||
    uzbekWordsCyrillic.test(t)
  ) {
    return true;
  }

  // Strong reject: non-Uzbek Cyrillic letters (Russian-only letters)
  // dominate. Uzbek Cyrillic uses ў, ғ, ҳ, қ; Russian-specific letters
  // like ы, э, ъ, ь are not part of standard Uzbek Cyrillic.
  const russianOnlyLetters = (t.match(/[ыэъь]/gi) || []).length;
  if (russianOnlyLetters >= 2) return false;

  // Strong reject: dense English function words. Counting unique hits
  // (rather than total) so a sentence with one repeated word doesn't
  // tip the scale; ≥2 distinct English function words against zero
  // Uzbek signals is enough to call it.
  const englishHits = new Set(
    (
      t.match(
        /\b(the|and|is|are|was|were|this|that|these|those|with|from|have|has|been|will|would|should|could|what|when|where|why|how|please|hello|explain)\b/gi
      ) || []
    ).map((w) => w.toLowerCase())
  );
  if (englishHits.size >= 2) return false;

  // Otherwise accept — better to let an ambiguous message through and
  // rely on the system prompt + retry loop than to block legitimate
  // Uzbek input the heuristic doesn't recognise.
  return true;
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
