import { analyzeErrorLog } from "./gemini";
import { normalizeLocale } from "./i18n";
import { playgroundHtml } from "./playground";
import type { Env, ErrorLogPayload } from "./types";

/**
 * Edge Labs — LLMOps Worker on Cloudflare Free Tier.
 * Gemini when GEMINI_API_KEY secret is set; otherwise Workers AI.
 * GET / = recruiter playground that shows which provider answered.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
      const locale = normalizeLocale(
        url.searchParams.get("lang") ?? url.searchParams.get("locale"),
      );
      return playgroundHtml(activeProvider(env), locale);
    }

    if (request.method === "GET" && url.pathname === "/health") {
      const provider = activeProvider(env);
      return json({
        ok: true,
        service: "edge-labs",
        /** Alias kept for older probes */
        llm: provider,
        provider,
        geminiConfigured: Boolean(env.GEMINI_API_KEY),
        workersAiBound: Boolean(env.AI),
        tip: "Open https://edge.galasse.dev/ to run a live analysis and see provider + model in the response.",
      });
    }

    if (request.method === "POST" && url.pathname === "/analyze-error") {
      return handleAnalyze(request, env);
    }

    return json({ error: "Not found" }, 404);
  },
} satisfies ExportedHandler<Env>;

function activeProvider(env: Env): "gemini" | "workers-ai" | "none" {
  if (env.GEMINI_API_KEY) {
    return "gemini";
  }
  if (env.AI) {
    return "workers-ai";
  }
  return "none";
}

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
          'Expected JSON: { "message": string, "stack"?: string, "context"?: string, "locale"?: "pt-BR"|"en-US" }',
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
    locale: normalizeLocale(obj.locale),
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
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}
