/**
 * MERIDIAN core philosophy — evidence engine, not oracle.
 * CMC provides data; MERIDIAN provides reasoning.
 * LLM sits near the end, never at the beginning.
 */

export type MeridianVerdict = "GRANT" | "DENY" | "WAIT" | "UNKNOWN";

export type MeridianDataQuality = "complete" | "partial" | "degraded" | "unavailable";

export const MERIDIAN_GOLDEN_RULES = [
  "Never hallucinate — every number must trace to a live API or deterministic skill.",
  "Never create synthetic values — if data is missing, mark DATA UNAVAILABLE.",
  "Never assume missing data — reduce confidence and abstain when inputs are absent.",
  "Every output must cite its data source with timestamp and freshness.",
  "Every score must be reproducible via /api/gate/evaluate and /api/meridian/intelligence.",
  "Risk overrides opportunity — liquidity and regime vetoes beat momentum.",
  "No single skill may dominate — Constitution Engine aggregates weighted evidence.",
  "Disagreement is healthy — Bull and Bear courts must both be visible.",
  "Uncertainty must be visible — show spread, dissent, and data gaps.",
  "If data quality is low, abstain — prefer WAIT over fake certainty.",
] as const;

export const MERIDIAN_CORE_PHILOSOPHY = {
  tagline: "MERIDIAN is a market intelligence operating system — not an AI predictor.",
  dataLayer: "CoinMarketCap APIs provide raw materials only.",
  skillLayer: "Skills are deterministic calculators, not chatbots.",
  reasoningLayer: "Bull Court, Bear Court, and Constitution provide judgment.",
  memoryLayer: "Historical analogs are references, not predictions.",
  llmPlacement: "LLM sits near the end for narration — never at the beginning for numbers.",
  confidenceModel:
    "Confidence is evidence-derived (conviction, similarity, spread, completeness) — not probability of profit.",
  abstention: "If evidence conflicts or data is insufficient, output WAIT or UNKNOWN.",
} as const;

export const MERIDIAN_EXPLAINABILITY_QUESTIONS = [
  "Why?",
  "Why now?",
  "Who disagrees?",
  "What breaks the thesis?",
  "How long does the thesis remain valid?",
  "Have we seen this before?",
  "What historical situations resemble this?",
] as const;

/** Instructions for any LLM touching MERIDIAN surfaces */
export const MERIDIAN_LLM_GUARDRAILS = [
  "Do not invent prices, RSI, Fear & Greed, volume, or conviction scores.",
  "Do not output BUY or SELL from skill logic — skills provide evidence only.",
  "Do not claim probability of profit — use conviction and evidence completeness.",
  "Do not smooth over missing data — say DATA UNAVAILABLE explicitly.",
  "Do not force agreement between Bull and Bear — show both sides.",
  "Do not mutate constitution rules automatically — suggest improvements only.",
  "Prefer WAIT over optimistic language when evidence is thin.",
  "Cite CoinMarketCap or skill name for every numeric claim.",
] as const;

export function resolveMeridianVerdict(input: {
  permitStatus?: "GRANT" | "DENY";
  dataQuality: MeridianDataQuality;
  hasConsensus: boolean;
}): MeridianVerdict {
  if (input.dataQuality === "unavailable") return "UNKNOWN";
  if (input.dataQuality === "degraded" && !input.hasConsensus) return "WAIT";
  if (input.dataQuality === "partial" && !input.hasConsensus) return "WAIT";
  if (!input.hasConsensus) return "WAIT";
  if (input.permitStatus === "GRANT") return "GRANT";
  if (input.permitStatus === "DENY") return "DENY";
  return "WAIT";
}

export function assessDataQuality(input: {
  cmcLive?: boolean;
  degraded?: boolean;
  fieldsPresent?: number;
  fieldsTotal?: number;
}): MeridianDataQuality {
  if (input.cmcLive === false && input.degraded) return "unavailable";
  if (input.cmcLive === false || input.degraded) return "degraded";
  const total = input.fieldsTotal ?? 0;
  const present = input.fieldsPresent ?? total;
  if (total > 0 && present / total < 0.6) return "partial";
  if (total > 0 && present / total < 0.85) return "partial";
  return "complete";
}
