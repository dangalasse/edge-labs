import { analyzeErrorLog } from "./gemini";
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
      return playgroundHtml(activeProvider(env));
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
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}

/** Minimal try-it page so recruiters see a live provider badge without curling. */
function playgroundHtml(provider: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Edge Labs — live LLMOps</title>
  <style>
    :root { --ink:#0f1419; --panel:#162229; --paper:#e8eef1; --mist:#9db0bb; --signal:#3dd6c6; --line:#2a3a44; --warn:#f0b429; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; font-family: ui-sans-serif, system-ui, sans-serif; background:var(--ink); color:var(--paper); padding:1.5rem; }
    main { max-width:40rem; margin:0 auto; }
    h1 { font-size:1.75rem; letter-spacing:-0.03em; margin:0 0 .5rem; }
    .badge { display:inline-block; font-family:ui-monospace,monospace; font-size:.75rem; padding:.35rem .6rem; border:1px solid var(--line); background:var(--panel); color:var(--signal); }
    .badge.warn { color:var(--warn); }
    p { color:var(--mist); line-height:1.5; }
    label { display:block; font-family:ui-monospace,monospace; font-size:.7rem; text-transform:uppercase; letter-spacing:.08em; color:var(--mist); margin:1rem 0 .35rem; }
    textarea, input { width:100%; background:var(--panel); border:1px solid var(--line); color:var(--paper); padding:.75rem; font:inherit; border-radius:0; }
    button { margin-top:1rem; background:var(--signal); color:var(--ink); border:0; padding:.7rem 1.1rem; font-weight:700; cursor:pointer; }
    button:disabled { opacity:.5; cursor:wait; }
    pre { margin-top:1.25rem; background:var(--panel); border:1px solid var(--line); padding:1rem; overflow:auto; font-size:.8rem; white-space:pre-wrap; }
    a { color:var(--signal); }
  </style>
</head>
<body>
  <main>
    <h1>Edge Labs</h1>
    <p>Live LLMOps on Cloudflare Free Tier. Paste an error log — the JSON response includes <code>provider</code>, <code>model</code>, and <code>analyzedAt</code> so you can verify this is a real inference, not a static mock.</p>
    <p>Active backend: <span class="badge" id="providerBadge">${provider}</span>
      ${provider === "workers-ai" ? '<span class="badge warn">Gemini secret not set — using Workers AI</span>' : ""}
      ${provider === "gemini" ? '<span class="badge">Google Gemini (AI Studio)</span>' : ""}
    </p>
    <label for="message">Error message</label>
    <textarea id="message" rows="3">ECONNREFUSED 127.0.0.1:5432</textarea>
    <label for="context">Context (optional)</label>
    <input id="context" value="NestJS boot — recruiter smoke test" />
    <button id="run" type="button">Analyze live</button>
    <pre id="out">Response will appear here…</pre>
    <p><a href="/health">/health</a> · <a href="https://github.com/dangalasse/edge-labs">source</a> · <a href="https://portfolio.galasse.dev/Projects/edge-labs">portfolio</a></p>
  </main>
  <script>
    const out = document.getElementById('out');
    const btn = document.getElementById('run');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      out.textContent = 'Calling POST /analyze-error…';
      try {
        const res = await fetch('/analyze-error', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            message: document.getElementById('message').value,
            context: document.getElementById('context').value,
          }),
        });
        const data = await res.json();
        out.textContent = JSON.stringify(data, null, 2);
        if (data.provider) {
          document.getElementById('providerBadge').textContent = data.provider;
        }
      } catch (e) {
        out.textContent = String(e);
      } finally {
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...corsHeaders(),
    },
  });
}
