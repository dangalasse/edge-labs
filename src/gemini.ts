import type { AnalysisResult, ErrorLogPayload } from "./types";

const DEFAULT_API_BASE = "https://generativelanguage.googleapis.com";

/**
 * Prefer Cloudflare Workers AI (account Free Tier) so the demo is always live
 * without a Google key. Fall back to Gemini AI Studio when GEMINI_API_KEY is set.
 * WHY: Recruiters can hit /analyze-error on day one; Gemini remains optional for LLMOps breadth.
 */
export async function analyzeErrorLog(
  payload: ErrorLogPayload,
  env: {
    AI?: Ai;
    GEMINI_API_KEY?: string;
    GEMINI_MODEL: string;
  },
): Promise<AnalysisResult> {
  if (env.GEMINI_API_KEY) {
    return analyzeWithGemini(payload, env.GEMINI_API_KEY, env.GEMINI_MODEL);
  }
  if (env.AI) {
    return analyzeWithWorkersAi(payload, env.AI);
  }
  throw new Error(
    "No LLM backend configured: bind Workers AI or set GEMINI_API_KEY secret",
  );
}

async function analyzeWithWorkersAi(
  payload: ErrorLogPayload,
  ai: Ai,
): Promise<AnalysisResult> {
  // WHY: llama on Workers AI is included in Cloudflare Free Tier quotas for portfolio demos.
  const model = "@cf/meta/llama-3.1-8b-instruct";
  const prompt = buildPrompt(payload);

  const result = await ai.run(model, {
    messages: [
      {
        role: "system",
        content:
          "You are a senior SRE. Reply with ONLY valid JSON: summary, likelyCause, suggestedFix (strings).",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 512,
  });

  const text =
    typeof result === "object" &&
    result !== null &&
    "response" in result &&
    typeof (result as { response: unknown }).response === "string"
      ? (result as { response: string }).response
      : JSON.stringify(result);

  return parseAnalysis(text, model);
}

export async function analyzeWithGemini(
  payload: ErrorLogPayload,
  apiKey: string,
  model: string,
): Promise<AnalysisResult> {
  const prompt = buildPrompt(payload);
  const url = `${DEFAULT_API_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini upstream failed with HTTP ${response.status}`);
  }

  const body = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned an empty candidate");
  }

  return parseAnalysis(text, model);
}

function buildPrompt(payload: ErrorLogPayload): string {
  return [
    `Error message: ${payload.message}`,
    payload.stack ? `Stack:\n${payload.stack}` : "",
    payload.context ? `Context:\n${payload.context}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseAnalysis(text: string, model: string): AnalysisResult {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: { summary?: string; likelyCause?: string; suggestedFix?: string };
  try {
    parsed = JSON.parse(cleaned) as typeof parsed;
  } catch {
    // WHY: some models wrap JSON poorly — still return something useful for demos.
    return {
      summary: cleaned.slice(0, 280),
      likelyCause: "Model did not return strict JSON; see summary",
      suggestedFix: "Re-run with GEMINI_API_KEY for stricter JSON mode",
      model,
    };
  }

  return {
    summary: parsed.summary?.trim() || "No summary",
    likelyCause: parsed.likelyCause?.trim() || "Unknown",
    suggestedFix:
      parsed.suggestedFix?.trim() || "Inspect logs and reproduce locally",
    model,
  };
}
