import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

const http = httpRouter();

const SITE_URL = process.env.SITE_URL;

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";

  // Always allow the requesting origin in development or if no SITE_URL is set
  let allowOrigin = origin;
  if (
    SITE_URL &&
    !origin.includes("localhost") &&
    !origin.includes("127.0.0.1")
  ) {
    // In production with SITE_URL set, only allow that origin
    allowOrigin = origin === SITE_URL ? origin : SITE_URL;
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Convex-Client",
    "Access-Control-Allow-Credentials": "true",
  };
}

function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(request))) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function preflight(request: Request): Response {
  const headers = corsHeaders(request);
  return new Response(null, {
    status: 204,
    headers: {
      ...headers,
      "Content-Length": "0",
    },
  });
}

function getThreadIdFromPath(url: string): Id<"threads"> | null {
  const pathname = new URL(url).pathname;
  // Match /api/threads/{threadId}/messages
  const match = pathname.match(/^\/api\/threads\/([^/]+)\/messages\/?$/);
  if (!match) return null;
  return match[1] as Id<"threads">;
}

// Create thread
http.route({
  path: "/api/threads",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => preflight(request)),
});

http.route({
  path: "/api/threads",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Verify token and get user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return withCors(request, new Response("Unauthorized", { status: 401 }));
    }

    // Parse request body
    let body: { title?: string } = {};
    try {
      body = (await request.json()) as { title?: string };
    } catch {
      body = {};
    }

    const user = await ctx.runMutation(api.users.ensureCurrentUserProfile, {});
    if (!user) {
      return withCors(request, new Response("Unauthorized", { status: 401 }));
    }

    // Create thread
    const threadId = await ctx.runMutation(api.threads.createThread, {
      userId: user._id,
      title: body.title,
    });

    return withCors(
      request,
      new Response(JSON.stringify({ threadId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }),
});

// Send message and generate reply - using pathPrefix for dynamic routing
http.route({
  pathPrefix: "/api/threads/",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => preflight(request)),
});

http.route({
  pathPrefix: "/api/threads/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const threadId = getThreadIdFromPath(request.url);
    if (!threadId || !request.url.includes("/messages")) {
      return withCors(request, new Response("Not found", { status: 404 }));
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return withCors(request, new Response("Unauthorized", { status: 401 }));
    }

    const user = await ctx.runMutation(api.users.ensureCurrentUserProfile, {});
    if (!user) {
      return withCors(request, new Response("Unauthorized", { status: 401 }));
    }

    // Verify thread ownership
    const thread = await ctx.runQuery(api.threads.getThread, { threadId });
    if (!thread) {
      return withCors(
        request,
        new Response("Thread not found", { status: 404 })
      );
    }

    if (user._id !== thread.userId) {
      return withCors(request, new Response("Forbidden", { status: 403 }));
    }

    // Parse request body
    const body = (await request.json()) as { content: string; model?: string };

    if (!body.content || body.content.trim().length === 0) {
      return withCors(
        request,
        new Response("Message content is required", { status: 400 })
      );
    }

    if (!body.model || body.model.trim().length === 0) {
      return withCors(
        request,
        new Response("Model is required", { status: 400 })
      );
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
    let assistantMessageId: Id<"messages">;
    try {
      assistantMessageId = await ctx.runAction(
        api.chat.generateAssistantReply,
        {
          threadId,
          userMessageId,
          model: body.model,
        }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Xatolik yuz berdi";
      const status = message.includes("Juda ko‘p so‘rov") ? 429 : 500;
      return withCors(request, new Response(message, { status }));
    }

    // Get the assistant message
    const messages = await ctx.runQuery(api.messages.listMessages, {
      threadId,
    });
    const assistantMessage = (messages as Array<Doc<"messages">>).find(
      (m) => m._id === assistantMessageId
    );

    return withCors(
      request,
      new Response(
        JSON.stringify({
          userMessageId,
          assistantMessageId,
          assistantMessage,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  }),
});

// List messages - using pathPrefix for dynamic routing
http.route({
  pathPrefix: "/api/threads/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const threadId = getThreadIdFromPath(request.url);
    if (!threadId || !request.url.includes("/messages")) {
      return withCors(request, new Response("Not found", { status: 404 }));
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return withCors(request, new Response("Unauthorized", { status: 401 }));
    }

    const user = await ctx.runMutation(api.users.ensureCurrentUserProfile, {});
    if (!user) {
      return withCors(request, new Response("Unauthorized", { status: 401 }));
    }

    // Verify thread ownership
    const thread = await ctx.runQuery(api.threads.getThread, { threadId });
    if (!thread) {
      return withCors(
        request,
        new Response("Thread not found", { status: 404 })
      );
    }

    if (user._id !== thread.userId) {
      return withCors(request, new Response("Forbidden", { status: 403 }));
    }

    // Get messages
    const messages = await ctx.runQuery(api.messages.listMessages, {
      threadId,
    });

    return withCors(
      request,
      new Response(JSON.stringify({ messages }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }),
});

// Register auth routes last to avoid conflicts with custom routes
authComponent.registerRoutes(http, createAuth, { cors: true });

export default http;
