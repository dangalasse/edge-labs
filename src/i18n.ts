/** Playground + API locale — mirrors portfolio `pt-BR` / `en-US`. */
export type Locale = "pt-BR" | "en-US";

export function normalizeLocale(raw: unknown): Locale {
  if (typeof raw !== "string") {
    return "pt-BR";
  }
  const v = raw.trim().toLowerCase().replace("_", "-");
  if (v === "en" || v === "en-us" || v.startsWith("en-")) {
    return "en-US";
  }
  return "pt-BR";
}

export function isEnglish(locale: Locale): boolean {
  return locale === "en-US";
}

export interface UiCopy {
  title: string;
  lead: string;
  activeBackend: string;
  geminiFallback: string;
  geminiActive: string;
  noBackend: string;
  errorLabel: string;
  contextLabel: string;
  analyze: string;
  analyzing: string;
  placeholder: string;
  resultTitle: string;
  summary: string;
  likelyCause: string;
  suggestedFix: string;
  proofTitle: string;
  provider: string;
  model: string;
  analyzedAt: string;
  showRaw: string;
  hideRaw: string;
  rawHint: string;
  health: string;
  source: string;
  portfolio: string;
  switchLanguage: string;
  localePt: string;
  localeEn: string;
  defaultMessage: string;
  defaultContext: string;
  errorGeneric: string;
}

const PT: UiCopy = {
  title: "Edge Labs",
  lead:
    "LLMOps ao vivo no Cloudflare Free Tier. Cole um log de erro — a resposta inclui provider, model e analyzedAt para você verificar que é inferência real, não um mock estático.",
  activeBackend: "Backend ativo",
  geminiFallback: "Secret Gemini não configurado — usando Workers AI",
  geminiActive: "Google Gemini (AI Studio)",
  noBackend: "Nenhum backend LLM disponível",
  errorLabel: "Mensagem de erro",
  contextLabel: "Contexto (opcional)",
  analyze: "Analisar ao vivo",
  analyzing: "Chamando POST /analyze-error…",
  placeholder: "O resultado aparece aqui…",
  resultTitle: "Análise",
  summary: "Resumo",
  likelyCause: "Causa provável",
  suggestedFix: "Correção sugerida",
  proofTitle: "Prova de inferência",
  provider: "Provider",
  model: "Modelo",
  analyzedAt: "Analisado em",
  showRaw: "Ver JSON bruto",
  hideRaw: "Ocultar JSON",
  rawHint: "Mesmo payload da API — útil para recrutadores validarem o contrato.",
  health: "/health",
  source: "código",
  portfolio: "portfolio",
  switchLanguage: "Idioma",
  localePt: "PT-BR",
  localeEn: "ENG-US",
  defaultMessage: "ECONNREFUSED 127.0.0.1:5432",
  defaultContext: "Boot NestJS — smoke test para recrutador",
  errorGeneric: "Falha na análise",
};

const EN: UiCopy = {
  title: "Edge Labs",
  lead:
    "Live LLMOps on Cloudflare Free Tier. Paste an error log — the response includes provider, model, and analyzedAt so you can verify this is a real inference, not a static mock.",
  activeBackend: "Active backend",
  geminiFallback: "Gemini secret not set — using Workers AI",
  geminiActive: "Google Gemini (AI Studio)",
  noBackend: "No LLM backend available",
  errorLabel: "Error message",
  contextLabel: "Context (optional)",
  analyze: "Analyze live",
  analyzing: "Calling POST /analyze-error…",
  placeholder: "Response will appear here…",
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
  rawHint: "Same API payload — useful for recruiters validating the contract.",
  health: "/health",
  source: "source",
  portfolio: "portfolio",
  switchLanguage: "Language",
  localePt: "PT-BR",
  localeEn: "ENG-US",
  defaultMessage: "ECONNREFUSED 127.0.0.1:5432",
  defaultContext: "NestJS boot — recruiter smoke test",
  errorGeneric: "Analysis failed",
};

export function copyFor(locale: Locale): UiCopy {
  return isEnglish(locale) ? EN : PT;
}

/** System instruction so LLM strings match UI locale. */
export function languageInstruction(locale: Locale): string {
  return isEnglish(locale)
    ? "Write summary, likelyCause, and suggestedFix in clear US English."
    : "Escreva summary, likelyCause e suggestedFix em português do Brasil (pt-BR), claro e técnico.";
}
