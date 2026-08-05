/** Request body for POST /analyze-error */
export interface ErrorLogPayload {
  message: string;
  stack?: string;
  context?: string;
}

/** Structured analysis returned to the caller */
export interface AnalysisResult {
  summary: string;
  likelyCause: string;
  suggestedFix: string;
  /** Concrete model id (e.g. llama fp8 or gemini-2.0-flash) */
  model: string;
  /** Which backend answered — recruiters can trust this over marketing copy */
  provider: "workers-ai" | "gemini";
  /** UTC timestamp of the inference */
  analyzedAt: string;
}


export interface Env {
  /** Optional — `wrangler secret put GEMINI_API_KEY` */
  GEMINI_API_KEY?: string;
  /** Non-secret model id from wrangler.toml [vars] */
  GEMINI_MODEL: string;
  /** Cloudflare Workers AI binding (Free Tier) — primary demo path */
  AI?: Ai;
}
