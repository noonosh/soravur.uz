import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import {
  OpenRouterClient,
  buildSystemPrompt,
  isLikelyUzbek,
  type ChatCompletionMessage,
} from "./openrouter";

const DEFAULT_MODEL = "meta-llama/llama-3.2-3b-instruct:free";
const MAX_CONTEXT_MESSAGES = 20;

export const generateAssistantReply = action({
  args: {
    threadId: v.id("threads"),
    userMessageId: v.id("messages"),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OpenRouter API key not configured");
    }

    // Get thread and verify ownership
    const thread = await ctx.runQuery(api.threads.getThread, {
      threadId: args.threadId,
    });
    if (!thread) {
      throw new Error("Thread not found");
    }

    // Get recent messages for context
    const messages = await ctx.runQuery(api.messages.listMessages, {
      threadId: args.threadId,
    });

    // Get the user message
    const userMessage = messages.find((m: any) => m._id === args.userMessageId);
    if (!userMessage || userMessage.role !== "user") {
      throw new Error("User message not found");
    }

    // Determine which model to use
    const selectedModel = args.model || DEFAULT_MODEL;

    // Check if the user message is in Uzbek
    if (!isLikelyUzbek(userMessage.content)) {
      // Ask user to write in Uzbek
      const responseContent =
        "Iltimos, savolingizni o'zbek tilida yozing. Men faqat o'zbek tilida yordam bera olaman. (Please write your question in Uzbek. I can only help in Uzbek language.)";

      return await ctx.runMutation(api.messages.appendAssistantMessage, {
        threadId: args.threadId,
        content: responseContent,
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
      ...recentMessages.map((m: any) => ({
        role: m.role as "user" | "assistant",
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
      const messageId = await ctx.runMutation(
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
