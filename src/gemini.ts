import { coachLanguageInstruction, languageInstruction, normalizeLocale } from "./i18n";
import { analyzeSystemInstructionForMode, systemInstructionForMode } from "./prompts";
import type {
  AnalysisResult,
  CoachMode,
  CoachPayload,
  CoachResult,
  ErrorLogPayload,
} from "./types";

const DEFAULT_API_BASE = "https://generativelanguage.googleapis.com";
const WORKERS_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

type LlmEnv = {
  AI?: Ai;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
};

/**
 * Prefer Gemini when GEMINI_API_KEY is set (real Google AI Studio path).
 * Otherwise Workers AI (Cloudflare Free Tier) so the demo stays live.
 */
export async function analyzeErrorLog(
  payload: ErrorLogPayload,
  env: LlmEnv,
): Promise<AnalysisResult> {
  const mode = payload.mode ?? "sre";
  const locale = normalizeLocale(payload.locale);
  const system = [analyzeSystemInstructionForMode(mode), languageInstruction(locale)].join(" ");
  const user = buildErrorPrompt(payload, mode);
  const raw = await runInference(env, system, user);
  return parseAnalysis(raw.text, raw.model, raw.provider, mode);
}

/** POST /coach — richer coaching shape for all modes including sre. */
export async function coach(payload: CoachPayload, env: LlmEnv): Promise<CoachResult> {
  const locale = normalizeLocale(payload.locale);
  const system = [
    systemInstructionForMode(payload.mode),
    coachLanguageInstruction(locale),
  ].join(" ");
  const user = buildCoachPrompt(payload);
  const raw = await runInference(env, system, user);
  return parseCoach(raw.text, raw.model, raw.provider);
}

function buildErrorPrompt(payload: ErrorLogPayload, mode: CoachMode): string {
  return [
    `Analysis mode: ${mode}`,
    `Error message: ${payload.message}`,
    payload.stack ? `Stack:\n${payload.stack}` : "",
    payload.context ? `Context:\n${payload.context}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function runInference(
  env: LlmEnv,
  system: string,
  user: string,
): Promise<{ text: string; model: string; provider: "workers-ai" | "gemini" }> {
  if (env.GEMINI_API_KEY) {
    return inferGemini(system, user, env.GEMINI_API_KEY, env.GEMINI_MODEL);
  }
  if (env.AI) {
    return inferWorkersAi(system, user, env.AI);
  }
  throw new Error(
    "No LLM backend configured: bind Workers AI or set GEMINI_API_KEY secret",
  );
}

async function inferWorkersAi(
  system: string,
  user: string,
  ai: Ai,
): Promise<{ text: string; model: string; provider: "workers-ai" }> {
  const result = await ai.run(WORKERS_AI_MODEL, {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 768,
  });

  const text =
    typeof result === "object" &&
    result !== null &&
    "response" in result &&
    typeof (result as { response: unknown }).response === "string"
      ? (result as { response: string }).response
      : JSON.stringify(result);

  return { text, model: WORKERS_AI_MODEL, provider: "workers-ai" };
}

async function inferGemini(
  system: string,
  user: string,
  apiKey: string,
  model: string,
): Promise<{ text: string; model: string; provider: "gemini" }> {
  const prompt = `${system}\n\n${user}`;
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

  return { text, model, provider: "gemini" };
}

function buildCoachPrompt(payload: CoachPayload): string {
  return [
    `Mode: ${payload.mode}`,
    `Question / scenario:\n${payload.message}`,
    payload.context ? `Context:\n${payload.context}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function cleanJsonText(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseAnalysis(
  text: string,
  model: string,
  provider: "workers-ai" | "gemini",
  mode: CoachMode,
): AnalysisResult {
  const cleaned = cleanJsonText(text);
  const analyzedAt = new Date().toISOString();

  let parsed: { summary?: string; likelyCause?: string; suggestedFix?: string };
  try {
    parsed = JSON.parse(cleaned) as typeof parsed;
  } catch {
    return {
      summary: cleaned.slice(0, 280),
      likelyCause: "Model did not return strict JSON; see summary",
      suggestedFix: "Inspect raw model output and retry",
      model,
      provider,
      mode,
      analyzedAt,
    };
  }

  return {
    summary: parsed.summary?.trim() || "No summary",
    likelyCause: parsed.likelyCause?.trim() || "Unknown",
    suggestedFix:
      parsed.suggestedFix?.trim() || "Inspect logs and reproduce locally",
    model,
    provider,
    mode,
    analyzedAt,
  };
}

function parseCoach(
  text: string,
  model: string,
  provider: "workers-ai" | "gemini",
): CoachResult {
  const cleaned = cleanJsonText(text);
  const analyzedAt = new Date().toISOString();

  let parsed: {
    summary?: string;
    invariants?: unknown;
    suggestedNextStep?: string;
    exampleSnippet?: string;
  };
  try {
    parsed = JSON.parse(cleaned) as typeof parsed;
  } catch {
    return {
      summary: cleaned.slice(0, 280),
      invariants: ["Model did not return strict JSON — verify raw output"],
      suggestedNextStep: "Retry with a shorter question or check provider logs",
      exampleSnippet: "",
      model,
      provider,
      analyzedAt,
    };
  }

  const invariants = Array.isArray(parsed.invariants)
    ? parsed.invariants
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return {
    summary: parsed.summary?.trim() || "No summary",
    invariants: invariants.length > 0 ? invariants : ["No invariants returned"],
    suggestedNextStep:
      parsed.suggestedNextStep?.trim() || "Clarify the scenario and retry",
    exampleSnippet: parsed.exampleSnippet?.trim() || "",
    model,
    provider,
    analyzedAt,
  };
}

export function normalizeCoachMode(raw: unknown): CoachMode | null {
  if (typeof raw !== "string") {
    return null;
  }
  const mode = raw.trim().toLowerCase();
  if (mode === "sre" || mode === "sdd" || mode === "ddd" || mode === "tdd") {
    return mode;
  }
  return null;
}
