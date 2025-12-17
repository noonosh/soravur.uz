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

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const MAX_CONTEXT_MESSAGES = 20;
const REQUESTS_PER_MINUTE_LIMIT = 12;

const CHEATING_KEYWORDS = [
  "javoblar",
  "javobini ayt",
  "kalit",
  "variant",
  "test javobi",
  "test javoblari",
  "shpargalka",
  "ko'chirish",
  "kochirish",
  "copy",
  "cheat",
  "answers",
];

export const generateAssistantReply = action({
  args: {
    threadId: v.id("threads"),
    userMessageId: v.id("messages"),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OpenRouter API key not configured");
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

    // Get recent messages for context
    const messages = (await ctx.runQuery(api.messages.listMessages, {
      threadId: args.threadId,
    })) as Array<Doc<"messages">>;

    // Get the user message
    const userMessage = messages.find((m) => m._id === args.userMessageId);
    if (!userMessage || userMessage.role !== "user") {
      throw new Error("User message not found");
    }

    // Determine which model to use
    const selectedModel = args.model || DEFAULT_MODEL;

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
    const userTextLower = userMessage.content.toLowerCase();
    if (CHEATING_KEYWORDS.some((k) => userTextLower.includes(k))) {
      return await ctx.runMutation(api.messages.appendAssistantMessage, {
        threadId: args.threadId,
        content:
          "Men imtihonda ko‘chirish yoki “javob kalitlari” topishga yordam bera olmayman. Ammo savolingizdagi mavzuni tushuntirib, yechish yo‘lini qadamlab ko‘rsatib beraman — masalani yoki variantni shu yerga yuboring.",
        model: selectedModel,
      });
    }

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
        max_tokens: 1000,
        temperature: 0.7,
      });

      const assistantContent = completion.choices[0].message.content;

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
          max_tokens: 1000,
          temperature: 0.5,
        });

        const retryContent = retryCompletion.choices[0].message.content;

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
      console.error("OpenRouter API error:", error);

      // Save error message
      return await ctx.runMutation(api.messages.appendAssistantMessage, {
        threadId: args.threadId,
        content:
          "Kechirasiz, texnik muammo yuz berdi. Iltimos, keyinroq urinib ko'ring.",
        model: selectedModel,
      });
    }
  },
});
