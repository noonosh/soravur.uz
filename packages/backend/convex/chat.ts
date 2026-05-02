import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  OpenRouterClient,
  buildSystemPrompt,
  isLikelyUzbek,
  type ChatCompletionMessage,
} from "./openrouter";

const MAX_CONTEXT_MESSAGES = 20;
const REQUESTS_PER_MINUTE_LIMIT = 12;

// Daily token caps (UTC day). Override via Convex env vars.
// Defaults are conservative — adjust upward in the dashboard for prod.
const DEFAULT_DAILY_TOKENS_PER_USER = 50_000;
const DEFAULT_DAILY_TOKENS_GLOBAL = 2_000_000;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

// Phrases that strongly imply asking for an answer key / cheat sheet.
// Matched as case-insensitive whole-phrase substrings; the words "copy",
// "variant", "kalit", and "answers" alone are too generic (they hit
// programming questions, multiple-choice prep, etc.) so we only match
// them in clearly cheat-coded contexts.
const CHEATING_PATTERNS: RegExp[] = [
  /\bjavoblar(ini|ni)?\s+(ayt|ber|yubor)/i, // "javoblarini ayt", "javoblar ber"
  /\bjavob\s+kalit/i, // "javob kaliti"
  /\btest\s+javob(lari)?/i, // "test javobi", "test javoblari"
  /\bshpargalk/i,
  /\bko[''ʻ]?chirish/i, // ko'chirish / kochirish
  /\bcheat\s*sheet\b/i,
  /\banswer\s*key\b/i,
];

function looksLikeCheatingRequest(text: string): boolean {
  return CHEATING_PATTERNS.some((re) => re.test(text));
}

export const generateAssistantReply = action({
  args: {
    threadId: v.id("threads"),
    userMessageId: v.id("messages"),
    model: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OpenRouter API key not configured");
    }

    if (!args.model || args.model.trim().length === 0) {
      throw new Error("Model is required");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get thread and verify ownership
    const thread = await ctx.runQuery(api.threads.getThread, {
      threadId: args.threadId,
    });
    if (!thread) {
      throw new Error("Thread not found");
    }

    const currentUser = await ctx.runQuery(api.users.getCurrentUserProfile, {});
    if (!currentUser) {
      throw new Error("Not authenticated");
    }
    if (currentUser._id !== thread.userId) {
      throw new Error("Forbidden");
    }

    // Per-user rate limiting (simple fixed window)
    await ctx.runMutation(api.rateLimits.checkAndIncrement, {
      userId: thread.userId,
      windowMs: 60_000,
      limit: REQUESTS_PER_MINUTE_LIMIT,
    });

    // Daily token caps — per-user and global circuit breaker.
    const userDailyCap = envInt(
      "DAILY_TOKENS_PER_USER",
      DEFAULT_DAILY_TOKENS_PER_USER
    );
    const globalDailyCap = envInt(
      "DAILY_TOKENS_GLOBAL",
      DEFAULT_DAILY_TOKENS_GLOBAL
    );
    const daily = await ctx.runQuery(api.usageEvents.getDailyTokens, {
      userId: thread.userId,
    });
    if (daily.userTokens >= userDailyCap) {
      throw new Error(
        "Bugungi kunlik so'rovlar chegarasiga yetdingiz. Iltimos, ertaga qayta urinib ko'ring."
      );
    }
    if (daily.globalTokens >= globalDailyCap) {
      throw new Error(
        "Tizim bugungi umumiy yuklanish chegarasiga yetdi. Iltimos, biroz keyinroq urinib ko'ring."
      );
    }

    // Get recent messages for context
    const messages = (await ctx.runQuery(api.messages.listMessages, {
      threadId: args.threadId,
    })) as Array<Doc<"messages">>;

    // Get the user message
    const userMessage = messages.find((m) => m._id === args.userMessageId);
    if (!userMessage || userMessage.role !== "user") {
      throw new Error("User message not found");
    }

    const selectedModel = args.model;

    // Check if the user message is in Uzbek
    if (!isLikelyUzbek(userMessage.content)) {
      // Ask user to write in Uzbek
      const responseContent =
        "Iltimos, savolingizni o'zbek tilida yozing. Men faqat o'zbek tilida yordam bera olaman.";

      return await ctx.runMutation(api.messages.appendAssistantMessage, {
        threadId: args.threadId,
        content: responseContent,
        model: selectedModel,
      });
    }

    // Refuse helping with cheating / answer keys
    if (looksLikeCheatingRequest(userMessage.content)) {
      return await ctx.runMutation(api.messages.appendAssistantMessage, {
        threadId: args.threadId,
        content:
          "Men imtihonda ko‘chirish yoki “javob kalitlari” topishga yordam bera olmayman. Ammo savolingizdagi mavzuni tushuntirib, yechish yo‘lini qadamlab ko‘rsatib beraman — masalani yoki variantni shu yerga yuboring.",
        model: selectedModel,
      });
    }

    // Stable id for cross-system error correlation. Used in structured
    // error logs so Sentry/Axiom can be joined back to the Convex event.
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    // Build conversation history (last N messages)
    const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);
    const conversationMessages: ChatCompletionMessage[] = [
      {
        role: "system",
        content: buildSystemPrompt(),
      },
      ...recentMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role,
          content: m.content,
        })),
    ];

    // Generate assistant reply
    const client = new OpenRouterClient(apiKey);

    try {
      const completion = await client.createChatCompletion({
        model: selectedModel,
        messages: conversationMessages,
        max_tokens: 3000,
        temperature: 0.7,
      });

      const choice = completion.choices[0];
      const assistantContent = choice?.message?.content || "";

      if (!assistantContent) {
        throw new Error("Empty response from AI model");
      }

      // Check if response was truncated
      if (choice?.finish_reason === "length") {
        console.warn("Response was truncated due to max_tokens limit");
        // Continue anyway - we'll save the partial response
      }

      // Double-check the response is in Uzbek
      if (!isLikelyUzbek(assistantContent)) {
        // Retry with stronger instruction
        const retryMessages = [
          ...conversationMessages,
          {
            role: "system" as const,
            content:
              "DIQQAT: Siz FAQAT o'zbek tilida javob berishingiz kerak! Ingliz yoki rus tilida javob bermang!",
          },
        ];

        const retryCompletion = await client.createChatCompletion({
          model: selectedModel,
          messages: retryMessages,
          max_tokens: 3000,
          temperature: 0.5,
        });

        const retryChoice = retryCompletion.choices[0];
        const retryContent = retryChoice?.message?.content || "";

        if (!retryContent) {
          throw new Error("Empty response from AI model on retry");
        }

        // Check if retry response was truncated
        if (retryChoice?.finish_reason === "length") {
          console.warn("Retry response was truncated due to max_tokens limit");
        }

        // Save the retry response
        return await ctx.runMutation(api.messages.appendAssistantMessage, {
          threadId: args.threadId,
          content: retryContent,
          model: selectedModel,
          tokenUsage: retryCompletion.usage
            ? {
                prompt: retryCompletion.usage.prompt_tokens,
                completion: retryCompletion.usage.completion_tokens,
                total: retryCompletion.usage.total_tokens,
              }
            : undefined,
        });
      }

      // Save the assistant response
      const messageId: Id<"messages"> = await ctx.runMutation(
        api.messages.appendAssistantMessage,
        {
          threadId: args.threadId,
          content: assistantContent,
          model: selectedModel,
          tokenUsage: completion.usage
            ? {
                prompt: completion.usage.prompt_tokens,
                completion: completion.usage.completion_tokens,
                total: completion.usage.total_tokens,
              }
            : undefined,
        }
      );

      // Log usage event
      if (completion.usage) {
        await ctx.runMutation(api.usageEvents.logUsage, {
          userId: thread.userId,
          threadId: args.threadId,
          requestId: completion.id,
          model: selectedModel,
          tokensTotal: completion.usage.total_tokens,
        });
      }

      // Auto-generate thread title from first exchange
      if (messages.length === 1) {
        const title =
          userMessage.content.slice(0, 50) +
          (userMessage.content.length > 50 ? "..." : "");
        await ctx.runMutation(api.threads.updateThreadTitle, {
          threadId: args.threadId,
          title,
        });
      }

      return messageId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // Structured log so Convex log search and any forwarder (Axiom,
      // Datadog, Sentry via web) can correlate by requestId/userId.
      console.error(
        JSON.stringify({
          event: "chat.openrouter_error",
          requestId,
          userId: thread.userId,
          threadId: args.threadId,
          model: selectedModel,
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        })
      );

      // Determine error type and provide appropriate message
      let userMessage =
        "Kechirasiz, texnik muammo yuz berdi. Iltimos, keyinroq urinib ko'ring.";

      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("ETIMEDOUT")
      ) {
        userMessage =
          "Javob olishda vaqt tugadi. Iltimos, qaytadan urinib ko'ring.";
      } else if (
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit")
      ) {
        userMessage = "Juda ko'p so'rov yuborildi. Iltimos, bir oz kuting.";
      } else if (errorMessage.includes("Empty response")) {
        userMessage =
          "Model javob bermadi. Iltimos, savolingizni soddaroq qilib qayta yuboring.";
      }

      // Save error message
      return await ctx.runMutation(api.messages.appendAssistantMessage, {
        threadId: args.threadId,
        content: userMessage,
        model: selectedModel,
      });
    }
  },
});
