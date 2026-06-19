/** MERIDIAN Market Memory Engine — unified intelligence payload */

export type MeridianGenome = {
  id: string;
  date: string;
  symbol: string;
  regime: string;
  fearGreed: number;
  breadth: number;
  narrative: string;
  volumeExpansion: number;
  relativeStrength: string;
  volatility: string;
  rsi: number;
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
  dissent: string[];
  permit: string;
};

export type MeridianNarrativeNode = {
  id: string;
  label: string;
  strength: number;
  trend: "rising" | "falling" | "stable";
};

export type MeridianNarrativeFlow = {
  radar: MeridianNarrativeNode[];
  migration: { from: string; to: string; strength: number }[];
  likelyNextLeader: { narrative: string; confidence: number };
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
  convictionAfter: number;
  delta: number;
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

export type MeridianIntelligencePayload = {
  schema: string;
  symbol: string;
  generatedAt: string;
  philosophy: string[];
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
  architecture: {
    tagline: string;
    coveragePct: number;
    cmcSkillCount: number;
    featuresLive: number;
    breadthPct: number;
    breadthLabel: string;
    dataSource: string;
  };
};
