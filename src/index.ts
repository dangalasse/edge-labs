import { analyzeErrorLog, coach, normalizeCoachMode } from "./gemini";
import {
  DemoGateError,
  clientIp,
  enforceTicketAndQuota,
  issueTicket,
  verifyServiceAuth,
  type DemoAudience,
} from "./demo-gate";
import { normalizeLocale } from "./i18n";
import { playgroundHtml } from "./playground";
import type { CoachPayload, Env, ErrorLogPayload } from "./types";

/**
 * Edge Labs — LLMOps Worker on Cloudflare Free Tier.
 * Mutations require Demo Gate (Turnstile → ticket → KV quota).
 */

const HONEYPOTS = new Set([
  "/.env",
  "/.git/config",
  "/admin",
  "/wp-admin",
  "/api/v1/secrets",
  "/api/keys",
  "/gemini-key",
]);

const WINK = ["tenta mais", "ainda não", "quase lá", "boa tentativa"];

const CORS_ORIGINS = new Set([
  "https://edge.galasse.dev",
  "https://portfolio.galasse.dev",
  "https://pipeview.galasse.dev",
  "https://staging.pipeview.galasse.dev",
  "https://pipeline.galasse.dev",
  "https://staging.pipeline.galasse.dev",
  "http://localhost:8787",
  "http://localhost:5173",
  "http://127.0.0.1:8787",
  "http://127.0.0.1:5173",
]);

const BODY_MAX_BYTES = 4 * 1024;
const PROMPT_CACHE_TTL_SEC = 60;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    // workers.dev alias: same gate as custom domain (no open proxy).
    if (HONEYPOTS.has(path) || HONEYPOTS.has(url.pathname)) {
      const hint = WINK[Math.abs(path.length * 17) % WINK.length]!;
      return json(
        {
          ok: false,
          hint,
          note: "Fourth wall: API keys are wrangler secrets, not this route.",
        },
        404,
        request,
      );
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
      const locale = normalizeLocale(
        url.searchParams.get("lang") ?? url.searchParams.get("locale"),
      );
      return playgroundHtml(activeProvider(env), locale, env.TURNSTILE_SITE_KEY);
    }

    if (request.method === "GET" && url.pathname === "/health") {
      const provider = activeProvider(env);
      return json(
        {
          ok: true,
          service: "edge-labs",
          llm: provider,
          provider,
          geminiConfigured: Boolean(env.GEMINI_API_KEY),
          workersAiBound: Boolean(env.AI),
          gate: Boolean(env.TURNSTILE_SECRET && env.DEMO_TICKET_SECRET),
          endpoints: ["/analyze-error", "/coach", "/demo-ticket"],
          coachModes: ["sre", "sdd", "ddd", "tdd"],
          tip: "Open https://edge.galasse.dev/ — complete Turnstile, then Analyze / Coach.",
        },
        200,
        request,
      );
    }

    if (request.method === "GET" && url.pathname === "/demo-config") {
      return json(
        {
          turnstileSiteKey: env.TURNSTILE_SITE_KEY || null,
          gateReady: Boolean(env.TURNSTILE_SECRET && env.DEMO_TICKET_SECRET),
        },
        200,
        request,
      );
    }

    if (request.method === "POST" && url.pathname === "/demo-ticket") {
      return handleTicket(request, env);
    }

    if (request.method === "POST" && url.pathname === "/analyze-error") {
      return handleAnalyze(request, env);
    }

    if (request.method === "POST" && url.pathname === "/coach") {
      return handleCoach(request, env);
    }

    return json({ error: "Not found", hint: "tenta mais" }, 404, request);
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

function llmEnv(env: Env) {
  return {
    AI: env.AI,
    GEMINI_API_KEY: env.GEMINI_API_KEY,
    GEMINI_MODEL: env.GEMINI_MODEL || "gemini-2.0-flash",
  };
}

function gateEnv(env: Env) {
  return {
    TURNSTILE_SECRET: env.TURNSTILE_SECRET,
    DEMO_TICKET_SECRET: env.DEMO_TICKET_SECRET,
    DEMO_GATE_KV: env.DEMO_GATE_KV,
  };
}

async function handleTicket(request: Request, env: Env): Promise<Response> {
  let body: { turnstileToken?: string; aud?: string };
  try {
    body = (await request.json()) as { turnstileToken?: string; aud?: string };
  } catch {
    return json({ error: "invalid_json", message: "Expected JSON body." }, 400, request);
  }
  try {
    const issued = await issueTicket(
      gateEnv(env),
      body.aud ?? "edge.analyze",
      clientIp(request),
      body.turnstileToken ?? "",
    );
    return json(issued, 200, request);
  } catch (err) {
    if (err instanceof DemoGateError) {
      return json({ error: err.code, message: err.message }, err.status, request);
    }
    return json({ error: "ticket_failed", message: String(err) }, 500, request);
  }
}

async function assertMutationGate(
  request: Request,
  env: Env,
  aud: DemoAudience,
): Promise<Response | null> {
  const service = request.headers.get("X-Demo-Service");
  if (
    (service === "pipeview" || service === "pipeline-pulse") &&
    env.DEMO_TICKET_SECRET
  ) {
    const ok = await verifyServiceAuth(
      env.DEMO_TICKET_SECRET,
      service,
      request.headers.get("X-Demo-Service-Ts"),
      request.headers.get("X-Demo-Service-Sig"),
    );
    if (ok) {
      return null;
    }
  }
  try {
    await enforceTicketAndQuota(
      gateEnv(env),
      request,
      aud,
      request.headers.get("X-Demo-Ticket"),
    );
    return null;
  } catch (err) {
    if (err instanceof DemoGateError) {
      return json({ error: err.code, message: err.message }, err.status, request);
    }
    return json({ error: "gate_error", message: String(err) }, 500, request);
  }
}

async function readCappedJson(request: Request): Promise<
  { ok: true; body: unknown } | { ok: false; response: Response }
> {
  const raw = await request.arrayBuffer();
  if (raw.byteLength > BODY_MAX_BYTES) {
    return {
      ok: false,
      response: json(
        {
          error: "body_too_large",
          message: `Body max ${BODY_MAX_BYTES} bytes.`,
        },
        413,
        request,
      ),
    };
  }
  try {
    const text = new TextDecoder().decode(raw);
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return {
      ok: false,
      response: json({ error: "Body must be JSON" }, 400, request),
    };
  }
}

async function cachedOrRun<T>(
  env: Env,
  cacheKey: string,
  run: () => Promise<T>,
): Promise<T> {
  const kv = env.DEMO_GATE_KV;
  if (!kv) {
    return run();
  }
  const hit = await kv.get(cacheKey, "json");
  if (hit) {
    return hit as T;
  }
  const result = await run();
  await kv.put(cacheKey, JSON.stringify(result), {
    expirationTtl: PROMPT_CACHE_TTL_SEC,
  });
  return result;
}

function promptCacheKey(kind: string, payload: unknown): string {
  return `pc:${kind}:${JSON.stringify(payload)}`;
}

async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  const backend = requireLlm(env, request);
  if (backend) {
    return backend;
  }

  const denied = await assertMutationGate(request, env, "edge.analyze");
  if (denied) return denied;

  const parsed = await readCappedJson(request);
  if (!parsed.ok) return parsed.response;

  const payload = normalizeErrorPayload(parsed.body);
  if (!payload) {
    return json(
      {
        error:
          'Expected JSON: { "message": string, "stack"?: string, "context"?: string, "locale"?: "pt-BR"|"en-US" }',
      },
      400,
      request,
    );
  }

  try {
    const result = await cachedOrRun(
      env,
      promptCacheKey("analyze", payload),
      () => analyzeErrorLog(payload, llmEnv(env)),
    );
    return json(result, 200, request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream failure";
    return json({ error: message }, 502, request);
  }
}

async function handleCoach(request: Request, env: Env): Promise<Response> {
  const backend = requireLlm(env, request);
  if (backend) {
    return backend;
  }

  const denied = await assertMutationGate(request, env, "edge.coach");
  if (denied) return denied;

  const parsed = await readCappedJson(request);
  if (!parsed.ok) return parsed.response;

  const payload = normalizeCoachPayload(parsed.body);
  if (!payload) {
    return json(
      {
        error:
          'Expected JSON: { "mode": "sre"|"sdd"|"ddd"|"tdd", "message": string, "context"?: string, "locale"?: "pt-BR"|"en-US" }',
      },
      400,
      request,
    );
  }

  try {
    const result = await cachedOrRun(
      env,
      promptCacheKey("coach", payload),
      () => coach(payload, llmEnv(env)),
    );
    return json(result, 200, request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream failure";
    return json({ error: message }, 502, request);
  }
}

function requireLlm(env: Env, request: Request): Response | null {
  if (!env.GEMINI_API_KEY && !env.AI) {
    return json(
      {
        error:
          "No LLM backend: enable Workers AI binding or wrangler secret put GEMINI_API_KEY",
      },
      503,
      request,
    );
  }
  return null;
}

function normalizeErrorPayload(raw: unknown): ErrorLogPayload | null {
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

function normalizeCoachPayload(raw: unknown): CoachPayload | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const mode = normalizeCoachMode(obj.mode);
  if (!mode || typeof obj.message !== "string" || obj.message.trim().length === 0) {
    return null;
  }
  return {
    mode,
    message: obj.message.trim(),
    context: typeof obj.context === "string" ? obj.context : undefined,
    locale: normalizeLocale(obj.locale),
  };
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  const allow =
    origin && CORS_ORIGINS.has(origin) ? origin : "https://edge.galasse.dev";
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers":
      "content-type, x-demo-ticket, x-demo-service, x-demo-service-ts, x-demo-service-sig",
    vary: "Origin",
  };
}

function json(data: unknown, status = 200, request?: Request): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(request ? corsHeaders(request) : {}),
    },
  });
}
