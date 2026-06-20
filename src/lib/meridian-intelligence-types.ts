/** MERIDIAN Market Memory Engine — unified intelligence payload */
import type { MeridianTradeJournal } from "@/lib/meridian-trade-journal";

import type { MeridianSkillEvidence } from "@/lib/meridian-skill-evidence";
import type { MeridianDataQuality, MeridianVerdict } from "@/lib/meridian-philosophy";
import type { MeridianTruthEnvelope } from "@/lib/meridian-truth-guard";

export type MeridianGenome = {
  id: string;
  date: string;
  symbol: string;
  regime: string;
  fearGreed: number | null;
  breadth: number | null;
  breadthLabel: string;
  narrative: string;
  volumeExpansion: number | null;
  relativeStrength: string;
  volatility: string;
  rsi: number | null;
  conviction: number;
};

export type MeridianMarketTwin = {
  label: string;
  period: string;
  similarity: number;
  confidence: "High" | "Medium" | "Low";
  outcomes: { symbol: string; returnPct: number }[];
  differences: string[];
  implication: string;
  /** Reference only — not a prediction */
  disclaimer: string;
  avgHistoricalReturnPct: number;
  /** Minimum symbol return in the analog episode — not equity max drawdown */
  worstHistoricalReturnPct: number;
  sampleSize: number;
};

export type MeridianCourtSide = {
  score: number;
  arguments: string[];
  layers: { name: string; signal: string; weight: number }[];
};

export type MeridianBullBearCourt = {
  bull: MeridianCourtSide;
  bear: MeridianCourtSide;
  verdict: "Bull wins" | "Bear wins" | "Deadlock";
  /** Net conviction = bull score − bear score (not probability) */
  netConviction: number;
  spread: number;
  dissent: string[];
  permit: string;
  /** Healthy disagreement — never forced agreement */
  conflictNote: string;
};

export type MeridianNarrativeNode = {
  id: string;
  label: string;
  strength: number;
  trend: "rising" | "falling" | "stable";
  source: "cmc-derived" | "benchmark-derived";
};

export type MeridianNarrativeFlow = {
  radar: MeridianNarrativeNode[];
  migration: { from: string; to: string; strength: number; source: "derived" }[];
  likelyNextLeader: { narrative: string; conviction: number };
};

export type MeridianTimeMachine = {
  avgReturnPct: number;
  winRatePct: number;
  avgDurationDays: number;
  worstDrawdownPct: number;
  sampleSize: number;
  source: string;
};

export type MeridianThesisDna = {
  id: string;
  regime: string;
  momentum: string;
  relativeStrength: string;
  volatility: string;
  liquidity: string;
  narrative: string;
  resemblanceNote: string | null;
};

export type MeridianConvictionDecay = {
  current: number;
  curve: { label: string; hours: number; value: number }[];
  reviewAfterHours: number;
  status: "fresh" | "aging" | "stale";
};

export type MeridianCounterfactual = {
  scenario: string;
  convictionBefore: number;
  convictionAfter: number | null;
  delta: number | null;
  /** recompute_failed when stress test could not run — no synthetic delta */
  status: "ok" | "recompute_failed";
  sensitivity: "high" | "medium" | "low";
};

export type MeridianConstitutionArticle = {
  id: string;
  title: string;
  rule: string;
  status: "active" | "triggered" | "violated";
  detail: string;
};

export type MeridianMemoryMatch = {
  genomeId: string;
  label: string;
  similarity: number;
  avgOutcomePct: number;
  winRatePct: number;
};

export type MeridianEvolutionHint = {
  constitutionId: string;
  winRatePct: number;
  sharpe: number;
  weakness: string;
  proposedMutation: string;
  expectedImprovement: string;
};

export type MeridianDataProvenance = {
  source: string;
  fetchedAt: string;
  freshnessLabel: string;
  cmcLive: boolean;
  dataQuality: MeridianDataQuality;
  dataCompletenessPct: number;
  fields: Array<{ field: string; source: string; value: string | number | null }>;
  staleWarning: string | null;
};

export type MeridianConfidenceBreakdown = {
  /** Evidence-derived — NOT probability of profit */
  conviction: number;
  historicalSimilarity: number;
  bullBearSpread: number;
  dataCompletenessPct: number;
  note: string;
};

export type MeridianExplainability = {
  why: string;
  whyNow: string;
  whoDisagrees: string[];
  thesisBreakers: string[];
  validityHours: number;
  seenBefore: string;
  historicalResemblance: string;
};

export type MeridianTradeAutopsy = {
  tradeId: string;
  symbol: string;
  side: string;
  expectedConviction: number;
  actualPnlUsd: number | null;
  outcome: "win" | "loss" | "flat" | "open";
  failedSkills: string[];
  passedSkills: string[];
  lesson: string;
  /** Suggest only — no automatic rule mutation */
  suggestedImprovement: string;
};

export type MeridianIntelligencePayload = {
  schema: string;
  symbol: string;
  generatedAt: string;
  philosophy: string[];
  goldenRules: string[];
  verdict: MeridianVerdict;
  verdictReason: string;
  confidence: MeridianConfidenceBreakdown;
  explainability: MeridianExplainability;
  provenance: MeridianDataProvenance;
  skillEvidence: MeridianSkillEvidence[];
  genome: MeridianGenome;
  marketTwin: MeridianMarketTwin;
  bullBearCourt: MeridianBullBearCourt;
  narrativeFlow: MeridianNarrativeFlow;
  timeMachine: MeridianTimeMachine | null;
  thesisDna: MeridianThesisDna;
  convictionDecay: MeridianConvictionDecay;
  counterfactuals: MeridianCounterfactual[];
  constitution: MeridianConstitutionArticle[];
  marketMemory: MeridianMemoryMatch[];
  evolution: MeridianEvolutionHint | null;
  tradeAutopsy: MeridianTradeAutopsy[];
  tradeJournal: MeridianTradeJournal;
  truth: MeridianTruthEnvelope;
  architecture: {
    tagline: string;
    coveragePct: number;
    cmcSkillCount: number;
    featuresLive: number;
    breadthPct: number | null;
    breadthLabel: string;
    dataSource: string;
  };
};
