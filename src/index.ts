import { analyzeErrorLog } from "./gemini";
import type { Env, ErrorLogPayload } from "./types";

/**
 * Edge Labs — LLMOps Worker on Cloudflare Free Tier.
 * Primary inference: Workers AI binding. Optional: Gemini via wrangler secret.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        service: "edge-labs",
        llm: env.GEMINI_API_KEY ? "gemini" : env.AI ? "workers-ai" : "none",
      });
    }

    if (request.method === "POST" && url.pathname === "/analyze-error") {
      return handleAnalyze(request, env);
    }

    return json({ error: "Not found" }, 404);
  },
} satisfies ExportedHandler<Env>;

async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  if (!env.GEMINI_API_KEY && !env.AI) {
    return json(
      {
        error:
          "No LLM backend: enable Workers AI binding or wrangler secret put GEMINI_API_KEY",
      },
      503,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body must be JSON" }, 400);
  }

  const payload = normalizePayload(body);
  if (!payload) {
    return json(
      {
        error:
          'Expected JSON: { "message": string, "stack"?: string, "context"?: string }',
      },
      400,
    );
  }

  try {
    const result = await analyzeErrorLog(payload, {
      AI: env.AI,
      GEMINI_API_KEY: env.GEMINI_API_KEY,
      GEMINI_MODEL: env.GEMINI_MODEL || "gemini-2.0-flash",
    });
    return json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream failure";
    return json({ error: message }, 502);
  }
}

function normalizePayload(raw: unknown): ErrorLogPayload | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.message !== "string" || obj.message.trim().length === 0) {
    return null;
  }
  return {
    message: obj.message.trim(),
    stack: typeof obj.stack === "string" ? obj.stack : undefined,
    context: typeof obj.context === "string" ? obj.context : undefined,
  };
}

function corsHeaders(): HeadersInit {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}
