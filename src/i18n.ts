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

export type PlaygroundTab = "erro" | "sdd" | "ddd" | "tdd";

export interface UiCopy {
  title: string;
  lead: string;
  activeBackend: string;
  geminiFallback: string;
  geminiUpgrade: string;
  workersAiHealthy: string;
  noBackend: string;
  tabErro: string;
  tabSdd: string;
  tabDdd: string;
  tabTdd: string;
  messageLabel: string;
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
  mode: string;
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
  ticketRequired: string;
}

const PT: UiCopy = {
  title: "Coach de erros no edge",
  lead:
    "O mesmo log de erro, quatro ângulos: SRE · SDD · DDD · TDD. Inferência no Cloudflare Workers AI (Free Tier). Cada resposta inclui provider, model, mode e analyzedAt.",
  activeBackend: "Backend ativo",
  geminiFallback: "Workers AI (Free Tier)",
  geminiUpgrade: "Gemini (upgrade opcional)",
  workersAiHealthy: "Workers AI (Free Tier)",
  noBackend: "Nenhum backend LLM disponível",
  tabErro: "SRE",
  tabSdd: "SDD",
  tabDdd: "DDD",
  tabTdd: "TDD",
  messageLabel: "Mensagem de erro",
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
  mode: "Modo",
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
  ticketRequired: "Completa a verificação humana (Turnstile) e tenta de novo.",
};

const EN: UiCopy = {
  title: "Edge error coach",
  lead:
    "The same error log, four angles: SRE · SDD · DDD · TDD. Inference on Cloudflare Workers AI (Free Tier). Every response includes provider, model, mode, and analyzedAt.",
  activeBackend: "Active backend",
  geminiFallback: "Workers AI (Free Tier)",
  geminiUpgrade: "Gemini (optional upgrade)",
  workersAiHealthy: "Workers AI (Free Tier)",
  noBackend: "No LLM backend available",
  tabErro: "SRE",
  tabSdd: "SDD",
  tabDdd: "DDD",
  tabTdd: "TDD",
  messageLabel: "Error message",
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
  mode: "Mode",
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
  ticketRequired: "Complete the human check (Turnstile), then try again.",
};

export function copyFor(locale: Locale): UiCopy {
  return isEnglish(locale) ? EN : PT;
}

/** System instruction so LLM strings match UI locale (analyze-error). */
export function languageInstruction(locale: Locale): string {
  return isEnglish(locale)
    ? "Write summary, likelyCause, and suggestedFix in clear US English."
    : "Escreva summary, likelyCause e suggestedFix em português do Brasil (pt-BR), claro e técnico.";
}

/** System instruction for POST /coach rich JSON shape. */
export function coachLanguageInstruction(locale: Locale): string {
  return isEnglish(locale)
    ? "Write summary, invariants, suggestedNextStep, and exampleSnippet in clear US English."
    : "Escreva summary, invariants, suggestedNextStep e exampleSnippet em português do Brasil (pt-BR), claro e técnico.";
}
