import type { Locale } from "./i18n";

/** Coach mode for POST /coach */
export type CoachMode = "sre" | "sdd" | "ddd" | "tdd";

/** Request body for POST /analyze-error */
export interface ErrorLogPayload {
  message: string;
  stack?: string;
  context?: string;
  /** Analysis lens — same error log, different angle. Default sre. */
  mode?: CoachMode;
  /** UI / answer language — mirrors portfolio `pt-BR` | `en-US` */
  locale?: Locale;
}

/** Request body for POST /coach */
export interface CoachPayload {
  mode: CoachMode;
  message: string;
  context?: string;
  locale?: Locale;
}

/** Structured analysis returned to the caller (POST /analyze-error — backward compat) */
export interface AnalysisResult {
  summary: string;
  likelyCause: string;
  suggestedFix: string;
  /** Concrete model id (e.g. llama fp8 or gemini-2.0-flash) */
  model: string;
  /** Which backend answered — recruiters can trust this over marketing copy */
  provider: "workers-ai" | "gemini";
  /** Lens used for this analysis */
  mode: CoachMode;
  /** UTC timestamp of the inference */
  analyzedAt: string;
}

/** Rich coaching response for POST /coach */
export interface CoachResult {
  summary: string;
  invariants: string[];
  suggestedNextStep: string;
  exampleSnippet: string;
  model: string;
  provider: "workers-ai" | "gemini";
  analyzedAt: string;
}

export interface Env {
  /** Optional — `wrangler secret put GEMINI_API_KEY` */
  GEMINI_API_KEY?: string;
  /** Non-secret model id from wrangler.toml [vars] */
  GEMINI_MODEL: string;
  /** Cloudflare Workers AI binding (Free Tier) — primary demo path */
  AI?: Ai;
  DEMO_GATE_KV: KVNamespace;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET?: string;
  DEMO_TICKET_SECRET?: string;
}
