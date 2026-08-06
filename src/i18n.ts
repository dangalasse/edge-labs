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
  geminiActive: string;
  noBackend: string;
  tabErro: string;
  tabSdd: string;
  tabDdd: string;
  tabTdd: string;
  messageLabel: string;
  errorLabel: string;
  contextLabel: string;
  analyze: string;
  coach: string;
  analyzing: string;
  coaching: string;
  placeholder: string;
  resultTitle: string;
  coachResultTitle: string;
  summary: string;
  likelyCause: string;
  suggestedFix: string;
  invariants: string;
  suggestedNextStep: string;
  exampleSnippet: string;
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
  defaultSddMessage: string;
  defaultSddContext: string;
  defaultDddMessage: string;
  defaultDddContext: string;
  defaultTddMessage: string;
  defaultTddContext: string;
  errorGeneric: string;
}

const PT: UiCopy = {
  title: "Edge Labs",
  lead:
    "LLMOps ao vivo no Cloudflare Free Tier. Abas Erro · SDD · DDD · TDD — cada resposta inclui provider, model e analyzedAt para provar inferência real.",
  activeBackend: "Backend ativo",
  geminiFallback: "Secret Gemini não configurado — usando Workers AI",
  geminiActive: "Google Gemini (AI Studio)",
  noBackend: "Nenhum backend LLM disponível",
  tabErro: "Erro",
  tabSdd: "SDD",
  tabDdd: "DDD",
  tabTdd: "TDD",
  messageLabel: "Pergunta / cenário",
  errorLabel: "Mensagem de erro",
  contextLabel: "Contexto (opcional)",
  analyze: "Analisar ao vivo",
  coach: "Coach ao vivo",
  analyzing: "Chamando POST /analyze-error…",
  coaching: "Chamando POST /coach…",
  placeholder: "O resultado aparece aqui…",
  resultTitle: "Análise",
  coachResultTitle: "Coaching",
  summary: "Resumo",
  likelyCause: "Causa provável",
  suggestedFix: "Correção sugerida",
  invariants: "Invariantes",
  suggestedNextStep: "Próximo passo",
  exampleSnippet: "Exemplo",
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
  defaultSddMessage:
    "Quero expor um endpoint de export CSV sem violar RBAC nem jobs assíncronos owner-scoped.",
  defaultSddContext: "Contexto TOTE — Inventário + Governança",
  defaultDddMessage:
    "O módulo de importação precisa falar com inventário — devo usar ACL ou eventos?",
  defaultDddContext: "NestJS module-per-feature, dois bounded contexts",
  defaultTddMessage:
    "Como escrever o primeiro teste para garantir que patrimony é único entre ativos activos?",
  defaultTddContext: "Invariante de domínio — soft delete",
  errorGeneric: "Falha na análise",
};

const EN: UiCopy = {
  title: "Edge Labs",
  lead:
    "Live LLMOps on Cloudflare Free Tier. Tabs Erro · SDD · DDD · TDD — every response includes provider, model, and analyzedAt to prove real inference.",
  activeBackend: "Active backend",
  geminiFallback: "Gemini secret not set — using Workers AI",
  geminiActive: "Google Gemini (AI Studio)",
  noBackend: "No LLM backend available",
  tabErro: "Erro",
  tabSdd: "SDD",
  tabDdd: "DDD",
  tabTdd: "TDD",
  messageLabel: "Question / scenario",
  errorLabel: "Error message",
  contextLabel: "Context (optional)",
  analyze: "Analyze live",
  coach: "Coach live",
  analyzing: "Calling POST /analyze-error…",
  coaching: "Calling POST /coach…",
  placeholder: "Response will appear here…",
  resultTitle: "Analysis",
  coachResultTitle: "Coaching",
  summary: "Summary",
  likelyCause: "Likely cause",
  suggestedFix: "Suggested fix",
  invariants: "Invariants",
  suggestedNextStep: "Next step",
  exampleSnippet: "Example",
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
  defaultSddMessage:
    "I need a CSV export endpoint without breaking RBAC or owner-scoped async jobs.",
  defaultSddContext: "TOTE context — Inventory + Governance",
  defaultDddMessage:
    "Import module must talk to inventory — ACL or domain events?",
  defaultDddContext: "NestJS module-per-feature, two bounded contexts",
  defaultTddMessage:
    "How do I write the first test ensuring patrimony is unique among active assets?",
  defaultTddContext: "Domain invariant — soft delete",
  errorGeneric: "Analysis failed",
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
