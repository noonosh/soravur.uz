import { v } from "convex/values";

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
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.SITE_URL || "https://soravur.com",
        "X-Title": "Soravur Exam Helper",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<ChatCompletionResponse>;
  }
}

// Uzbek language detection (basic heuristic)
export function isLikelyUzbek(text: string): boolean {
  // Uzbek-specific letters in Latin script
  const uzbekLetters = /[ʻʼ''oʻgʻ]/i;
  // Common Uzbek words
  const uzbekWords =
    /\b(va|bilan|uchun|agar|lekin|siz|men|bu|u|ular|bizning|sizning|qanday|nima|nega|qachon|qayerda|kim|shunday|har|hamma|yoki|chunki|shuning|keyin|oldin|hozir|bugun|kecha|ertaga)\b/i;

  // Check for Cyrillic Uzbek
  const cyrillicUzbek = /[ўғҳқ]/;

  return (
    uzbekLetters.test(text) || uzbekWords.test(text) || cyrillicUzbek.test(text)
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

JAVOB STRUKTURASI:
- Asosiy javob
- Qadamlar (agar kerak bo'lsa)
- Asosiy tushunchalar
- Ko'p uchraydigan xatolar
- Tekshirish`;
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
