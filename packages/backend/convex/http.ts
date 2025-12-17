import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

// Create thread
http.route({
  path: "/api/threads",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Get auth token from header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify token and get user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response("Invalid token", { status: 401 });
    }

    // Get or create user
    const userId = await ctx.runMutation(api.users.upsertUserFromIdentity, {
      authSubject: identity.subject,
      displayName: identity.name,
    });

    // Parse request body
    const body = (await request.json()) as { title?: string };

    // Create thread
    const threadId = await ctx.runMutation(api.threads.createThread, {
      userId,
      title: body.title,
    });

    return new Response(JSON.stringify({ threadId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Send message and generate reply
http.route({
  path: "/api/threads/:threadId/messages",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Get auth token from header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response("Invalid token", { status: 401 });
    }

    // Get threadId from URL params
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const threadIdIndex = pathParts.indexOf("threads") + 1;
    const threadId = pathParts[threadIdIndex] as any;

    // Verify thread ownership
    const thread = await ctx.runQuery(api.threads.getThread, { threadId });
    if (!thread) {
      return new Response("Thread not found", { status: 404 });
    }

    // Get user
    const user = await ctx.runQuery(api.users.getCurrentUserProfile, {});
    if (!user || user._id !== thread.userId) {
      return new Response("Forbidden", { status: 403 });
    }

    // Parse request body
    const body = (await request.json()) as { content: string };

    if (!body.content || body.content.trim().length === 0) {
      return new Response("Message content is required", { status: 400 });
    }

    // Append user message
    const userMessageId = await ctx.runMutation(
      api.messages.appendUserMessage,
      {
        threadId,
        content: body.content,
      }
    );

    // Generate assistant reply
    const assistantMessageId = await ctx.runAction(
      api.chat.generateAssistantReply,
      {
        threadId,
        userMessageId,
      }
    );

    // Get the assistant message
    const messages = await ctx.runQuery(api.messages.listMessages, {
      threadId,
    });
    const assistantMessage = messages.find(
      (m: any) => m._id === assistantMessageId
    );

    return new Response(
      JSON.stringify({
        userMessageId,
        assistantMessageId,
        assistantMessage,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

// List messages
http.route({
  path: "/api/threads/:threadId/messages",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Get auth token from header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response("Invalid token", { status: 401 });
    }

    // Get threadId from URL params
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const threadIdIndex = pathParts.indexOf("threads") + 1;
    const threadId = pathParts[threadIdIndex] as any;

    // Verify thread ownership
    const thread = await ctx.runQuery(api.threads.getThread, { threadId });
    if (!thread) {
      return new Response("Thread not found", { status: 404 });
    }

    const user = await ctx.runQuery(api.users.getCurrentUserProfile, {});
    if (!user || user._id !== thread.userId) {
      return new Response("Forbidden", { status: 403 });
    }

    // Get messages
    const messages = await ctx.runQuery(api.messages.listMessages, {
      threadId,
    });

    return new Response(JSON.stringify({ messages }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
