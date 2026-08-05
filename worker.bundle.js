var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/i18n.ts
function normalizeLocale(raw) {
  if (typeof raw !== "string") {
    return "pt-BR";
  }
  const v = raw.trim().toLowerCase().replace("_", "-");
  if (v === "en" || v === "en-us" || v.startsWith("en-")) {
    return "en-US";
  }
  return "pt-BR";
}
__name(normalizeLocale, "normalizeLocale");
function isEnglish(locale) {
  return locale === "en-US";
}
__name(isEnglish, "isEnglish");
var PT = {
  title: "Edge Labs",
  lead: "LLMOps ao vivo no Cloudflare Free Tier. Cole um log de erro \u2014 a resposta inclui provider, model e analyzedAt para voc\xEA verificar que \xE9 infer\xEAncia real, n\xE3o um mock est\xE1tico.",
  activeBackend: "Backend ativo",
  geminiFallback: "Secret Gemini n\xE3o configurado \u2014 usando Workers AI",
  geminiActive: "Google Gemini (AI Studio)",
  noBackend: "Nenhum backend LLM dispon\xEDvel",
  errorLabel: "Mensagem de erro",
  contextLabel: "Contexto (opcional)",
  analyze: "Analisar ao vivo",
  analyzing: "Chamando POST /analyze-error\u2026",
  placeholder: "O resultado aparece aqui\u2026",
  resultTitle: "An\xE1lise",
  summary: "Resumo",
  likelyCause: "Causa prov\xE1vel",
  suggestedFix: "Corre\xE7\xE3o sugerida",
  proofTitle: "Prova de infer\xEAncia",
  provider: "Provider",
  model: "Modelo",
  analyzedAt: "Analisado em",
  showRaw: "Ver JSON bruto",
  hideRaw: "Ocultar JSON",
  rawHint: "Mesmo payload da API \u2014 \xFAtil para recrutadores validarem o contrato.",
  health: "/health",
  source: "c\xF3digo",
  portfolio: "portfolio",
  switchLanguage: "Idioma",
  localePt: "PT-BR",
  localeEn: "ENG-US",
  defaultMessage: "ECONNREFUSED 127.0.0.1:5432",
  defaultContext: "Boot NestJS \u2014 smoke test para recrutador",
  errorGeneric: "Falha na an\xE1lise"
};
var EN = {
  title: "Edge Labs",
  lead: "Live LLMOps on Cloudflare Free Tier. Paste an error log \u2014 the response includes provider, model, and analyzedAt so you can verify this is a real inference, not a static mock.",
  activeBackend: "Active backend",
  geminiFallback: "Gemini secret not set \u2014 using Workers AI",
  geminiActive: "Google Gemini (AI Studio)",
  noBackend: "No LLM backend available",
  errorLabel: "Error message",
  contextLabel: "Context (optional)",
  analyze: "Analyze live",
  analyzing: "Calling POST /analyze-error\u2026",
  placeholder: "Response will appear here\u2026",
  resultTitle: "Analysis",
  summary: "Summary",
  likelyCause: "Likely cause",
  suggestedFix: "Suggested fix",
  proofTitle: "Inference proof",
  provider: "Provider",
  model: "Model",
  analyzedAt: "Analyzed at",
  showRaw: "Show raw JSON",
  hideRaw: "Hide JSON",
  rawHint: "Same API payload \u2014 useful for recruiters validating the contract.",
  health: "/health",
  source: "source",
  portfolio: "portfolio",
  switchLanguage: "Language",
  localePt: "PT-BR",
  localeEn: "ENG-US",
  defaultMessage: "ECONNREFUSED 127.0.0.1:5432",
  defaultContext: "NestJS boot \u2014 recruiter smoke test",
  errorGeneric: "Analysis failed"
};
function copyFor(locale) {
  return isEnglish(locale) ? EN : PT;
}
__name(copyFor, "copyFor");
function languageInstruction(locale) {
  return isEnglish(locale) ? "Write summary, likelyCause, and suggestedFix in clear US English." : "Escreva summary, likelyCause e suggestedFix em portugu\xEAs do Brasil (pt-BR), claro e t\xE9cnico.";
}
__name(languageInstruction, "languageInstruction");

// src/gemini.ts
var DEFAULT_API_BASE = "https://generativelanguage.googleapis.com";
async function analyzeErrorLog(payload, env) {
  if (env.GEMINI_API_KEY) {
    return analyzeWithGemini(payload, env.GEMINI_API_KEY, env.GEMINI_MODEL);
  }
  if (env.AI) {
    return analyzeWithWorkersAi(payload, env.AI);
  }
  throw new Error(
    "No LLM backend configured: bind Workers AI or set GEMINI_API_KEY secret"
  );
}
__name(analyzeErrorLog, "analyzeErrorLog");
function systemPrompt(payload) {
  const locale = normalizeLocale(payload.locale);
  return [
    "You are a senior SRE.",
    "Reply with ONLY valid JSON keys: summary, likelyCause, suggestedFix (strings).",
    languageInstruction(locale)
  ].join(" ");
}
__name(systemPrompt, "systemPrompt");
async function analyzeWithWorkersAi(payload, ai) {
  const model = "@cf/meta/llama-3.1-8b-instruct-fp8";
  const prompt = buildPrompt(payload);
  const result = await ai.run(model, {
    messages: [
      {
        role: "system",
        content: systemPrompt(payload)
      },
      { role: "user", content: prompt }
    ],
    max_tokens: 512
  });
  const text = typeof result === "object" && result !== null && "response" in result && typeof result.response === "string" ? result.response : JSON.stringify(result);
  return parseAnalysis(text, model, "workers-ai");
}
__name(analyzeWithWorkersAi, "analyzeWithWorkersAi");
async function analyzeWithGemini(payload, apiKey, model) {
  const prompt = `${systemPrompt(payload)}

${buildPrompt(payload)}`;
  const url = `${DEFAULT_API_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    })
  });
  if (!response.ok) {
    throw new Error(`Gemini upstream failed with HTTP ${response.status}`);
  }
  const body = await response.json();
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned an empty candidate");
  }
  return parseAnalysis(text, model, "gemini");
}
__name(analyzeWithGemini, "analyzeWithGemini");
function buildPrompt(payload) {
  return [
    `Error message: ${payload.message}`,
    payload.stack ? `Stack:
${payload.stack}` : "",
    payload.context ? `Context:
${payload.context}` : ""
  ].filter(Boolean).join("\n");
}
__name(buildPrompt, "buildPrompt");
function parseAnalysis(text, model, provider) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const analyzedAt = (/* @__PURE__ */ new Date()).toISOString();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      summary: cleaned.slice(0, 280),
      likelyCause: "Model did not return strict JSON; see summary",
      suggestedFix: "Inspect raw model output and retry",
      model,
      provider,
      analyzedAt
    };
  }
  return {
    summary: parsed.summary?.trim() || "No summary",
    likelyCause: parsed.likelyCause?.trim() || "Unknown",
    suggestedFix: parsed.suggestedFix?.trim() || "Inspect logs and reproduce locally",
    model,
    provider,
    analyzedAt
  };
}
__name(parseAnalysis, "parseAnalysis");

// src/playground.ts
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
__name(escapeHtml, "escapeHtml");
function flagSvg(locale) {
  if (isEnglish(locale)) {
    return `<svg width="18" height="12" viewBox="0 0 18 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="18" height="12" fill="#b22234"/><rect y="1" width="18" height="1" fill="#fff"/><rect y="3" width="18" height="1" fill="#fff"/><rect y="5" width="18" height="1" fill="#fff"/><rect y="7" width="18" height="1" fill="#fff"/><rect y="9" width="18" height="1" fill="#fff"/><rect y="11" width="18" height="1" fill="#fff"/><rect width="7.2" height="6.5" fill="#3c3b6e"/></svg>`;
  }
  return `<svg width="18" height="12" viewBox="0 0 18 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="18" height="12" fill="#009c3b"/><polygon points="9,1.2 16.5,6 9,10.8 1.5,6" fill="#ffdf00"/><circle cx="9" cy="6" r="2.4" fill="#002776"/></svg>`;
}
__name(flagSvg, "flagSvg");
function statusBadges(provider, t) {
  const parts = [
    `<span class="badge" id="providerBadge">${escapeHtml(provider)}</span>`
  ];
  if (provider === "workers-ai") {
    parts.push(`<span class="badge warn" id="backendNote">${escapeHtml(t.geminiFallback)}</span>`);
  } else if (provider === "gemini") {
    parts.push(`<span class="badge" id="backendNote">${escapeHtml(t.geminiActive)}</span>`);
  } else {
    parts.push(`<span class="badge warn" id="backendNote">${escapeHtml(t.noBackend)}</span>`);
  }
  return parts.join("\n      ");
}
__name(statusBadges, "statusBadges");
function playgroundHtml(provider, locale) {
  const t = copyFor(locale);
  const other = isEnglish(locale) ? "pt-BR" : "en-US";
  const otherLabel = isEnglish(locale) ? t.localePt : t.localeEn;
  const currentLabel = isEnglish(locale) ? t.localeEn : t.localePt;
  const copyJson = JSON.stringify(t).replaceAll("</", "<\\/");
  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(t.title)} \u2014 LLMOps</title>
  <meta name="description" content="${escapeHtml(t.lead)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    :root {
      --ink: #0b1215;
      --ink-soft: #101a1f;
      --panel: #162229;
      --paper: #e8eef1;
      --mist: #9db0bb;
      --signal: #3dd6c6;
      --line: #2a3a44;
      --warn: #f0b429;
      --ok: #6bcf7f;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Figtree, ui-sans-serif, system-ui, sans-serif;
      background:
        radial-gradient(ellipse 80% 50% at 10% -10%, rgba(61, 214, 198, 0.12), transparent 50%),
        radial-gradient(ellipse 60% 40% at 100% 0%, rgba(240, 180, 41, 0.06), transparent 45%),
        var(--ink);
      color: var(--paper);
      padding: 1.25rem 1.5rem 2.5rem;
    }
    .shell { max-width: 42rem; margin: 0 auto; }
    .topbar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: clamp(1.75rem, 4vw, 2.15rem);
      letter-spacing: -0.03em;
      margin: 0;
      font-weight: 700;
    }
    .lead { color: var(--mist); line-height: 1.55; margin: 0.65rem 0 1.25rem; max-width: 38rem; }
    .lead code {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.85em;
      color: var(--paper);
    }
    .locale-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      border: 1px solid var(--line);
      background: color-mix(in srgb, var(--panel) 70%, transparent);
      color: var(--mist);
      padding: 0.35rem 0.55rem;
      font: 500 0.7rem/1 "IBM Plex Mono", ui-monospace, monospace;
      letter-spacing: 0.04em;
      cursor: pointer;
      text-decoration: none;
      transition: border-color 0.15s, color 0.15s;
      white-space: nowrap;
    }
    .locale-toggle:hover { border-color: color-mix(in srgb, var(--signal) 50%, var(--line)); color: var(--paper); }
    .locale-toggle svg { display: block; flex-shrink: 0; }
    .status-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
      color: var(--mist);
      font-size: 0.95rem;
    }
    .badge {
      display: inline-block;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.72rem;
      padding: 0.35rem 0.6rem;
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--signal);
    }
    .badge.warn { color: var(--warn); }
    label {
      display: block;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--mist);
      margin: 1.1rem 0 0.35rem;
    }
    textarea, input[type="text"] {
      width: 100%;
      background: var(--panel);
      border: 1px solid var(--line);
      color: var(--paper);
      padding: 0.75rem 0.85rem;
      font: 400 0.95rem/1.45 Figtree, sans-serif;
      border-radius: 0;
    }
    textarea:focus, input:focus {
      outline: 2px solid color-mix(in srgb, var(--signal) 55%, transparent);
      outline-offset: 1px;
    }
    .actions { margin-top: 1.1rem; display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
    .btn-primary {
      background: var(--signal);
      color: var(--ink);
      border: 0;
      padding: 0.7rem 1.15rem;
      font: 700 0.95rem Figtree, sans-serif;
      cursor: pointer;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: wait; }
    .btn-ghost {
      background: transparent;
      border: 1px solid var(--line);
      color: var(--mist);
      padding: 0.55rem 0.85rem;
      font: 500 0.8rem "IBM Plex Mono", monospace;
      cursor: pointer;
    }
    .btn-ghost:hover { color: var(--paper); border-color: var(--signal); }
    .btn-ghost[hidden] { display: none; }
    #resultRegion { margin-top: 1.5rem; min-height: 3rem; }
    .placeholder {
      border: 1px dashed var(--line);
      background: var(--ink-soft);
      color: var(--mist);
      padding: 1rem 1.1rem;
      font-size: 0.9rem;
    }
    .result {
      border: 1px solid var(--line);
      background: color-mix(in srgb, var(--panel) 85%, transparent);
      padding: 0;
    }
    .result-head {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.9rem 1.1rem;
      border-bottom: 1px solid var(--line);
    }
    .result-head h2 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .result dl {
      margin: 0;
      display: grid;
      gap: 0;
    }
    .result .field {
      padding: 1rem 1.1rem;
      border-bottom: 1px solid var(--line);
    }
    .result .field:last-of-type { border-bottom: 0; }
    .result dt {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--signal);
      margin: 0 0 0.4rem;
    }
    .result dd {
      margin: 0;
      color: var(--paper);
      line-height: 1.55;
      font-size: 0.98rem;
    }
    .proof {
      margin: 0;
      padding: 0.9rem 1.1rem 1.1rem;
      background: var(--ink-soft);
      border-top: 1px solid var(--line);
    }
    .proof h3 {
      margin: 0 0 0.65rem;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.68rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--ok);
    }
    .proof-grid {
      display: grid;
      gap: 0.55rem;
    }
    @media (min-width: 520px) {
      .proof-grid { grid-template-columns: auto 1fr; gap: 0.35rem 1rem; align-items: baseline; }
    }
    .proof dt {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.72rem;
      color: var(--mist);
      margin: 0;
    }
    .proof dd {
      margin: 0;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.78rem;
      color: var(--paper);
      word-break: break-all;
    }
    .raw-wrap { margin-top: 0.85rem; }
    .raw-wrap pre {
      margin: 0.5rem 0 0;
      background: var(--ink);
      border: 1px solid var(--line);
      padding: 0.85rem 1rem;
      overflow: auto;
      font: 400 0.75rem/1.45 "IBM Plex Mono", monospace;
      white-space: pre-wrap;
      color: var(--mist);
    }
    .raw-hint { margin: 0.35rem 0 0; font-size: 0.8rem; color: var(--mist); }
    .error-box {
      border: 1px solid color-mix(in srgb, var(--warn) 50%, var(--line));
      background: color-mix(in srgb, var(--warn) 8%, var(--panel));
      padding: 1rem 1.1rem;
      color: var(--paper);
    }
    .footer-links {
      margin-top: 1.75rem;
      color: var(--mist);
      font-size: 0.9rem;
    }
    a { color: var(--signal); }
  </style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <div>
        <h1 data-i18n="title">${escapeHtml(t.title)}</h1>
      </div>
      <a
        class="locale-toggle"
        id="localeToggle"
        href="/?lang=${other}"
        title="${escapeHtml(t.switchLanguage)}: ${escapeHtml(otherLabel)}"
        aria-label="${escapeHtml(t.switchLanguage)}: ${escapeHtml(otherLabel)}"
        data-current="${locale}"
        data-other="${other}">
        ${flagSvg(locale)}
        <span id="localeLabel">${escapeHtml(currentLabel)}</span>
      </a>
    </header>

    <p class="lead" data-i18n="lead">${escapeHtml(t.lead)}</p>

    <p class="status-row">
      <span data-i18n="activeBackend">${escapeHtml(t.activeBackend)}</span>:
      ${statusBadges(provider, t)}
    </p>

    <form id="analyzeForm" novalidate>
      <label for="message" data-i18n="errorLabel">${escapeHtml(t.errorLabel)}</label>
      <textarea id="message" name="message" rows="3" required>${escapeHtml(t.defaultMessage)}</textarea>

      <label for="context" data-i18n="contextLabel">${escapeHtml(t.contextLabel)}</label>
      <input id="context" name="context" type="text" value="${escapeHtml(t.defaultContext)}" autocomplete="off" />

      <div class="actions">
        <button class="btn-primary" id="run" type="submit" data-i18n="analyze">${escapeHtml(t.analyze)}</button>
      </div>
    </form>

    <section id="resultRegion" aria-live="polite" aria-atomic="true">
      <div class="placeholder" data-i18n="placeholder">${escapeHtml(t.placeholder)}</div>
    </section>

    <p class="footer-links">
      <a href="/health" data-i18n="health">${escapeHtml(t.health)}</a>
      \xB7
      <a href="https://github.com/dangalasse/edge-labs" data-i18n="source">${escapeHtml(t.source)}</a>
      \xB7
      <a href="https://portfolio.galasse.dev/Projects/edge-labs" data-i18n="portfolio">${escapeHtml(t.portfolio)}</a>
    </p>
  </div>

  <script type="application/json" id="i18n-boot">${copyJson}<\/script>
  <script>
    (() => {
      const STORAGE_KEY = "edge-labs-locale";
      const boot = JSON.parse(document.getElementById("i18n-boot").textContent);
      let locale = document.documentElement.lang || "pt-BR";
      let copy = boot;

      const COPY = {
        "pt-BR": null,
        "en-US": null,
      };
      COPY[locale] = boot;

      const FLAG = {
        "pt-BR": '${flagSvg("pt-BR").replaceAll("'", "\\'")}',
        "en-US": '${flagSvg("en-US").replaceAll("'", "\\'")}',
      };

      const EN = ${JSON.stringify(copyFor("en-US")).replaceAll("</", "<\\/")};
      const PT = ${JSON.stringify(copyFor("pt-BR")).replaceAll("</", "<\\/")};
      COPY["en-US"] = EN;
      COPY["pt-BR"] = PT;

      function applyCopy(next) {
        locale = next === "en-US" ? "en-US" : "pt-BR";
        copy = COPY[locale];
        document.documentElement.lang = locale;
        try { localStorage.setItem(STORAGE_KEY, locale); } catch (_) {}

        const otherFixed = locale === "en-US" ? "pt-BR" : "en-US";
        const toggle = document.getElementById("localeToggle");
        toggle.href = "/?lang=" + otherFixed;
        toggle.dataset.current = locale;
        toggle.dataset.other = otherFixed;
        toggle.title = copy.switchLanguage + ": " + (locale === "en-US" ? copy.localePt : copy.localeEn);
        toggle.setAttribute("aria-label", toggle.title);
        toggle.innerHTML = FLAG[locale] + '<span id="localeLabel">' +
          (locale === "en-US" ? copy.localeEn : copy.localePt) + "</span>";

        document.querySelectorAll("[data-i18n]").forEach((el) => {
          const key = el.getAttribute("data-i18n");
          if (key && copy[key] != null) el.textContent = copy[key];
        });

        const note = document.getElementById("backendNote");
        if (note) {
          const provider = document.getElementById("providerBadge")?.textContent || "";
          if (provider === "workers-ai") note.textContent = copy.geminiFallback;
          else if (provider === "gemini") note.textContent = copy.geminiActive;
          else note.textContent = copy.noBackend;
        }

        const msg = document.getElementById("message");
        const ctx = document.getElementById("context");
        if (msg && !msg.dataset.dirty) msg.value = copy.defaultMessage;
        if (ctx && !ctx.dataset.dirty) ctx.value = copy.defaultContext;

        const region = document.getElementById("resultRegion");
        if (region.dataset.hasResult !== "1") {
          region.innerHTML = '<div class="placeholder" data-i18n="placeholder">' +
            escapeHtml(copy.placeholder) + "</div>";
        } else if (region.dataset.lastJson) {
          try { renderResult(JSON.parse(region.dataset.lastJson)); } catch (_) {}
        }
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");
      }

      function formatAnalyzedAt(iso) {
        try {
          return new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "medium",
            timeZone: "UTC",
          }).format(new Date(iso)) + " UTC";
        } catch (_) {
          return iso;
        }
      }

      function renderResult(data) {
        const region = document.getElementById("resultRegion");
        region.dataset.hasResult = "1";
        region.dataset.lastJson = JSON.stringify(data);

        if (data.error) {
          region.innerHTML =
            '<div class="error-box" role="alert"><strong>' +
            escapeHtml(copy.errorGeneric) +
            "</strong><p>" +
            escapeHtml(data.error) +
            "</p></div>";
          return;
        }

        const raw = JSON.stringify(data, null, 2);
        region.innerHTML =
          '<article class="result">' +
          '<header class="result-head"><h2>' + escapeHtml(copy.resultTitle) + "</h2></header>" +
          "<dl>" +
          '<div class="field"><dt>' + escapeHtml(copy.summary) + "</dt><dd>" + escapeHtml(data.summary || "\u2014") + "</dd></div>" +
          '<div class="field"><dt>' + escapeHtml(copy.likelyCause) + "</dt><dd>" + escapeHtml(data.likelyCause || "\u2014") + "</dd></div>" +
          '<div class="field"><dt>' + escapeHtml(copy.suggestedFix) + "</dt><dd>" + escapeHtml(data.suggestedFix || "\u2014") + "</dd></div>" +
          "</dl>" +
          '<aside class="proof" aria-label="' + escapeHtml(copy.proofTitle) + '">' +
          "<h3>" + escapeHtml(copy.proofTitle) + "</h3>" +
          '<dl class="proof-grid">' +
          "<dt>" + escapeHtml(copy.provider) + "</dt><dd>" + escapeHtml(data.provider || "\u2014") + "</dd>" +
          "<dt>" + escapeHtml(copy.model) + "</dt><dd>" + escapeHtml(data.model || "\u2014") + "</dd>" +
          "<dt>" + escapeHtml(copy.analyzedAt) + "</dt><dd><time datetime='" + escapeHtml(data.analyzedAt || "") + "'>" +
          escapeHtml(data.analyzedAt ? formatAnalyzedAt(data.analyzedAt) : "\u2014") +
          "</time></dd>" +
          "</dl>" +
          '<div class="raw-wrap">' +
          '<button type="button" class="btn-ghost" id="toggleRaw" aria-expanded="false">' +
          escapeHtml(copy.showRaw) +
          "</button>" +
          '<p class="raw-hint">' + escapeHtml(copy.rawHint) + "</p>" +
          '<pre id="rawJson" hidden>' + escapeHtml(raw) + "</pre>" +
          "</div>" +
          "</aside>" +
          "</article>";

        const btn = document.getElementById("toggleRaw");
        const pre = document.getElementById("rawJson");
        btn.addEventListener("click", () => {
          const open = pre.hasAttribute("hidden");
          if (open) {
            pre.removeAttribute("hidden");
            btn.setAttribute("aria-expanded", "true");
            btn.textContent = copy.hideRaw;
          } else {
            pre.setAttribute("hidden", "");
            btn.setAttribute("aria-expanded", "false");
            btn.textContent = copy.showRaw;
          }
        });

        if (data.provider) {
          const badge = document.getElementById("providerBadge");
          if (badge) badge.textContent = data.provider;
        }
      }

      document.getElementById("message").addEventListener("input", (e) => {
        e.target.dataset.dirty = "1";
      });
      document.getElementById("context").addEventListener("input", (e) => {
        e.target.dataset.dirty = "1";
      });

      document.getElementById("localeToggle").addEventListener("click", (e) => {
        e.preventDefault();
        const next = locale === "en-US" ? "pt-BR" : "en-US";
        applyCopy(next);
        history.replaceState(null, "", "/?lang=" + next);
      });

      document.getElementById("analyzeForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("run");
        const region = document.getElementById("resultRegion");
        btn.disabled = true;
        region.dataset.hasResult = "0";
        region.innerHTML = '<div class="placeholder">' + escapeHtml(copy.analyzing) + "</div>";
        try {
          const res = await fetch("/analyze-error", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              message: document.getElementById("message").value,
              context: document.getElementById("context").value,
              locale,
            }),
          });
          const data = await res.json();
          renderResult(data);
        } catch (err) {
          renderResult({ error: String(err) });
        } finally {
          btn.disabled = false;
        }
      });

      // Prefer stored locale when URL has no explicit lang (first visit defaults to SSR locale).
      try {
        const params = new URLSearchParams(location.search);
        const fromUrl = params.get("lang") || params.get("locale");
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!fromUrl && stored && (stored === "pt-BR" || stored === "en-US") && stored !== locale) {
          applyCopy(stored);
          history.replaceState(null, "", "/?lang=" + stored);
        } else {
          try { localStorage.setItem(STORAGE_KEY, locale); } catch (_) {}
        }
      } catch (_) {}
    })();
  <\/script>
</body>
</html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}
__name(playgroundHtml, "playgroundHtml");

// src/index.ts
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
      const locale = normalizeLocale(
        url.searchParams.get("lang") ?? url.searchParams.get("locale")
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
        tip: "Open https://edge.galasse.dev/ to run a live analysis and see provider + model in the response."
      });
    }
    if (request.method === "POST" && url.pathname === "/analyze-error") {
      return handleAnalyze(request, env);
    }
    return json({ error: "Not found" }, 404);
  }
};
function activeProvider(env) {
  if (env.GEMINI_API_KEY) {
    return "gemini";
  }
  if (env.AI) {
    return "workers-ai";
  }
  return "none";
}
__name(activeProvider, "activeProvider");
async function handleAnalyze(request, env) {
  if (!env.GEMINI_API_KEY && !env.AI) {
    return json(
      {
        error: "No LLM backend: enable Workers AI binding or wrangler secret put GEMINI_API_KEY"
      },
      503
    );
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body must be JSON" }, 400);
  }
  const payload = normalizePayload(body);
  if (!payload) {
    return json(
      {
        error: 'Expected JSON: { "message": string, "stack"?: string, "context"?: string, "locale"?: "pt-BR"|"en-US" }'
      },
      400
    );
  }
  try {
    const result = await analyzeErrorLog(payload, {
      AI: env.AI,
      GEMINI_API_KEY: env.GEMINI_API_KEY,
      GEMINI_MODEL: env.GEMINI_MODEL || "gemini-2.0-flash"
    });
    return json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream failure";
    return json({ error: message }, 502);
  }
}
__name(handleAnalyze, "handleAnalyze");
function normalizePayload(raw) {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const obj = raw;
  if (typeof obj.message !== "string" || obj.message.trim().length === 0) {
    return null;
  }
  return {
    message: obj.message.trim(),
    stack: typeof obj.stack === "string" ? obj.stack : void 0,
    context: typeof obj.context === "string" ? obj.context : void 0,
    locale: normalizeLocale(obj.locale)
  };
}
__name(normalizePayload, "normalizePayload");
function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}
__name(corsHeaders, "corsHeaders");
function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders()
    }
  });
}
__name(json, "json");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
