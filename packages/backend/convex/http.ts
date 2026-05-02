import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { isSubject } from "./prompts";

const http = httpRouter();

const SITE_URL = process.env.SITE_URL;

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (SITE_URL && origin === SITE_URL) return true;

  // Allow localhost only when SITE_URL itself is a localhost dev URL
  // (or unset, e.g. local convex dev without SITE_URL exported).
  const siteIsLocal =
    !SITE_URL ||
    SITE_URL.includes("localhost") ||
    SITE_URL.includes("127.0.0.1");
  if (siteIsLocal) {
    try {
      const host = new URL(origin).hostname;
      return host === "localhost" || host === "127.0.0.1";
    } catch {
      return false;
    }
  }
  return false;
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  if (!isAllowedOrigin(origin)) {
    // No CORS headers for disallowed origins. Browser will block the request.
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
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
    const body = (await request.json()) as {
      content: string;
      model?: string;
      subject?: string;
    };

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

    // `subject` was added in PR 1 (subject-aware system prompts).
    // Convex auto-deploys ahead of Vercel, so for one deploy cycle the
    // old frontend bundle (cached in users' browsers) will keep posting
    // without `subject`. Fall back to "maths" rather than 400-ing
    // those requests. Tighten to required in a follow-up once stale
    // bundles have rotated out (≥ ~1 week post-deploy).
    const resolvedSubject: "maths" | "literature" | "programming" = isSubject(
      body.subject
    )
      ? body.subject
      : "maths";

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
          subject: resolvedSubject,
        }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Xatolik yuz berdi";
      const isRateLimited =
        message.includes("Juda ko‘p so‘rov") ||
        message.includes("kunlik so'rovlar chegarasiga") ||
        message.includes("umumiy yuklanish chegarasiga");
      const status = isRateLimited ? 429 : 500;
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
