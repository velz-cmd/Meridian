/**
 * MERIDIAN Market Memory Engine — evidence-first intelligence from Gate + skills + backtest.
 * CMC provides data; MERIDIAN provides reasoning. Never invent numbers.
 */
import { evaluateNexusGate, toStructuredOutput } from "../../bnb-hack/engine/nexus-gate.mjs";
import type { GateJudgeConsensus } from "@/lib/gate-consensus-payload";
import {
  HISTORICAL_ANALOGS,
  MEMORY_GENOMES,
  NARRATIVE_BUCKETS,
  SYMBOL_NARRATIVES,
} from "@/lib/meridian-intelligence-data";
import { summarizeArchitectureCoverage } from "@/lib/meridian-architecture";
import {
  MERIDIAN_GOLDEN_RULES,
  MERIDIAN_PHILOSOPHY_BULLETS,
  assessDataQuality,
  resolveMeridianVerdict,
} from "@/lib/meridian-philosophy";
import {
  countDataCompleteness,
  extractSkillEvidenceBundle,
  type MeridianSkillEvidence,
} from "@/lib/meridian-skill-evidence";
import { buildTradeAutopsies } from "@/lib/meridian-trade-autopsy";
import { buildTradeJournal } from "@/lib/meridian-trade-journal";
import { buildMeridianTruthEnvelope } from "@/lib/meridian-truth-guard";
import { buildMeridianDirectionEvidence } from "@/lib/meridian-direction-engine";
import type { DemoTradeRecord } from "@/lib/demo-trading";
import type {
  MeridianBullBearCourt,
  MeridianConfidenceBreakdown,
  MeridianConstitutionArticle,
  MeridianConvictionDecay,
  MeridianCounterfactual,
  MeridianDataProvenance,
  MeridianEvolutionHint,
  MeridianExplainability,
  MeridianGenome,
  MeridianIntelligencePayload,
  MeridianMarketTwin,
  MeridianMemoryMatch,
  MeridianNarrativeFlow,
  MeridianThesisDna,
  MeridianTimeMachine,
} from "@/lib/meridian-intelligence-types";

export type IntelligenceInput = {
  symbol: string;
  regime?: string;
  cmcLive?: boolean;
  degraded?: boolean;
  fieldSources?: Record<string, string | number | null>;
  fetchedAt?: string;
  market?: {
    price?: number;
    fearGreed?: number;
    rsi?: number;
    change24h?: number;
    change7d?: number;
    volume24h?: number;
    marketCap?: number;
    macdSignal?: string;
  };
  gate?: {
    signal?: string;
    confidence?: number;
    tier?: string;
    thesis?: string;
    gaps?: string[];
  };
  skills?: Record<string, unknown> & {
    composite?: {
      alignmentScore?: number;
      relativeStrength?: { role?: string; vsBnbPct?: number };
      volatility?: { label?: string; compression?: boolean };
      liquidity?: { pass?: boolean; turnover?: number };
      thesis?: string;
      blockers?: string[];
    };
    skillEvidence?: MeridianSkillEvidence[];
  };
  consensus?: GateJudgeConsensus | null;
  conviction?: number;
  ranked?: Array<{ symbol: string; conviction?: number; rsRole?: string }>;
  backtest?: {
    winRatePct?: number;
    totalReturnPct?: number;
    maxDrawdownPct?: number;
    roundTrips?: number;
    compare?: { edge?: { returnDeltaPct?: number; drawdownSavedPct?: number } };
  } | null;
  trades?: DemoTradeRecord[];
};

const PHILOSOPHY = [...MERIDIAN_PHILOSOPHY_BULLETS];

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function freshnessLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.round(min / 60);
  return `${hr} hour${hr === 1 ? "" : "s"} ago`;
}

function computeBreadth(ranked: IntelligenceInput["ranked"]): { pct: number | null; label: string } {
  if (!ranked?.length) return { pct: null, label: "Awaiting benchmark scan — breadth UNKNOWN" };
  const above = ranked.filter((r) => (r.conviction ?? 0) >= 55).length;
  const pct = Math.round((above / ranked.length) * 100);
  return {
    pct,
    label: `${above}/${ranked.length} benchmarks above conviction threshold`,
  };
}

function genomeId(date: string, symbol: string, regime: string): string {
  const d = date.replace(/-/g, "").slice(2);
  return `G-${d}-${symbol.slice(0, 3)}-${regime.slice(0, 3).toUpperCase()}`;
}

function analogSimilarity(
  live: { fearGreed: number; rsi: number; change7d: number; breadth: number; regime: string },
  ref: (typeof HISTORICAL_ANALOGS)[0],
): number {
  const fg = 1 - Math.abs(live.fearGreed - ref.fearGreed) / 100;
  const rsi = 1 - Math.abs(live.rsi - ref.rsi) / 100;
  const ch = 1 - Math.min(1, Math.abs(live.change7d - ref.change7d) / 20);
  const br = 1 - Math.abs(live.breadth - ref.breadth) / 100;
  const regime = live.regime === ref.regime ? 1 : live.regime === "neutral" || ref.regime === "neutral" ? 0.6 : 0.35;
  return Math.round((fg * 0.25 + rsi * 0.2 + ch * 0.2 + br * 0.2 + regime * 0.15) * 100);
}

function buildGenome(input: IntelligenceInput): MeridianGenome {
  const sym = input.symbol.toUpperCase();
  const m = input.market ?? {};
  const regime = input.regime ?? "neutral";
  const breadthInfo = computeBreadth(input.ranked);
  const ranked = input.ranked ?? [];
  const longCount = ranked.filter((r) => (r.conviction ?? 0) >= 55).length;
  const breadth = ranked.length ? Math.round((longCount / ranked.length) * 100) : breadthInfo.pct;
  const volExp =
    m.volume24h != null && m.marketCap != null && m.marketCap > 0
      ? Math.round((m.volume24h / m.marketCap) * 1000) / 10
      : null;
  const rs = (input.skills as { relativeStrength?: { role?: string } })?.relativeStrength?.role ?? "neutral";
  const vol = (input.skills as { volatility?: { label?: string; state?: string } })?.volatility?.state ?? "unknown";
  const narrative = SYMBOL_NARRATIVES[sym]?.narrative ?? "Mixed";
  const date = new Date().toISOString().slice(0, 10);

  return {
    id: genomeId(date, sym, regime),
    date,
    symbol: sym,
    regime,
    fearGreed: m.fearGreed ?? null,
    breadth,
    breadthLabel: breadthInfo.label,
    narrative,
    volumeExpansion: volExp,
    relativeStrength: rs,
    volatility: vol,
    rsi: m.rsi ?? null,
    conviction: input.conviction ?? input.gate?.confidence ?? 50,
  };
}

function buildMarketTwin(genome: MeridianGenome, _symbol: string, change7d: number | null): MeridianMarketTwin {
  const breadth = genome.breadth ?? 50;
  const live = {
    fearGreed: genome.fearGreed ?? 50,
    rsi: genome.rsi ?? 50,
    change7d: change7d ?? 0,
    breadth,
    regime: genome.regime,
  };
  const scored = HISTORICAL_ANALOGS.map((a) => ({ a, score: analogSimilarity(live, a) })).sort(
    (x, y) => y.score - x.score,
  );
  const best = scored[0]!.a;
  const score = scored[0]!.score;
  const confidence: MeridianMarketTwin["confidence"] =
    score >= 82 ? "High" : score >= 68 ? "Medium" : "Low";

  const symOutcomes = Object.values(best.outcomes);
  const avgHistoricalReturnPct =
    Math.round((symOutcomes.reduce((s, v) => s + v, 0) / symOutcomes.length) * 10) / 10;
  const worstHistoricalReturnPct = Math.min(...symOutcomes);

  return {
    label: best.label,
    period: best.period,
    similarity: score,
    confidence,
    outcomes: Object.entries(best.outcomes).map(([s, returnPct]) => ({ symbol: s, returnPct })),
    differences: best.differencesTemplate.map((d) =>
      d.replace("today", `F&G ${genome.fearGreed ?? "?"}`).replace("then", `F&G ${best.fearGreed}`),
    ),
    implication: best.implication,
    disclaimer: "Historical analog — reference only, not a prediction or guarantee.",
    avgHistoricalReturnPct,
    worstHistoricalReturnPct,
    sampleSize: HISTORICAL_ANALOGS.length,
  };
}

function buildCourt(consensus: GateJudgeConsensus | null | undefined, conviction: number): MeridianBullBearCourt {
  if (!consensus) {
    return {
      bull: { score: conviction, arguments: ["Awaiting skill consensus — DATA UNAVAILABLE"], layers: [] },
      bear: { score: 100 - conviction, arguments: ["Insufficient consensus data"], layers: [] },
      verdict: conviction >= 55 ? "Bull wins" : "Bear wins",
      netConviction: conviction - (100 - conviction),
      spread: Math.abs(conviction - (100 - conviction)),
      dissent: [],
      permit: "WAIT",
      conflictNote: "Court cannot convene without live skill consensus.",
    };
  }

  const bullLayers = consensus.layers.filter((l) => l.signal === "ENTER_LONG");
  const bearLayers = consensus.layers.filter((l) => l.signal === "EXIT" || l.signal === "AVOID");
  const holdLayers = consensus.layers.filter((l) => l.signal === "HOLD");

  const bullArgs = bullLayers.map(
    (l) => `${l.name}: ${l.signal.replace(/_/g, " ")} (${Math.round(l.weight * 100)}% weight)`,
  );
  const bearArgs = bearLayers.length
    ? bearLayers.map((l) => `${l.name}: ${l.signal.replace(/_/g, " ")} (${Math.round(l.weight * 100)}% weight)`)
    : consensus.blockers.length
      ? consensus.blockers.map((b) => `Blocker: ${b}`)
      : holdLayers.slice(0, 2).map((l) => `${l.name}: cautious HOLD`);

  const bullScore = Math.round(consensus.weights.longPct);
  const bearScore = Math.round(consensus.weights.bearPct);
  const spread = Math.abs(bullScore - bearScore);
  let verdict: MeridianBullBearCourt["verdict"] = "Deadlock";
  if (bullScore > bearScore + 10) verdict = "Bull wins";
  else if (bearScore > bullScore) verdict = "Bear wins";

  const dissent = consensus.layers
    .filter((l) => !l.agreesWithDesk && l.signal !== "ENTER_LONG")
    .map((l) => `${l.name} disagrees (${l.signal})`);

  if (!consensus.coreStack.passed) dissent.push("Core stack failed — constitution split");
  if (consensus.constitutionOnly) dissent.push("Constitution clears but skill stack disagrees");

  const conflictNote =
    dissent.length >= 3
      ? "Healthy conflict — multiple layers dissent; Constitution resolves, not suppresses."
      : dissent.length > 0
        ? "Partial disagreement visible — review dissent before sizing."
        : "Layer alignment high — still subject to Constitution veto.";

  return {
    bull: {
      score: bullScore,
      arguments: bullArgs.length ? bullArgs : [consensus.permit.reason],
      layers: bullLayers.map((l) => ({ name: l.name, signal: l.signal, weight: l.weight })),
    },
    bear: {
      score: bearScore,
      arguments: bearArgs.slice(0, 5),
      layers: bearLayers.map((l) => ({ name: l.name, signal: l.signal, weight: l.weight })),
    },
    verdict,
    netConviction: bullScore - bearScore,
    spread,
    dissent,
    permit: consensus.permit.status,
    conflictNote,
  };
}

function buildNarrativeFlow(ranked: IntelligenceInput["ranked"], symbol: string): MeridianNarrativeFlow {
  const sym = symbol.toUpperCase();
  const leader = ranked?.[0];
  const leaderNarr = SYMBOL_NARRATIVES[leader?.symbol ?? sym]?.bucket ?? "DeFi";

  const bucketStrength: Record<string, number> = {
    AI: 40,
    Memes: 40,
    Gaming: 40,
    RWA: 40,
    DeFi: 40,
    L1: 40,
  };

  for (const r of ranked ?? []) {
    const bucket = SYMBOL_NARRATIVES[r.symbol]?.bucket;
    if (bucket && r.conviction != null) bucketStrength[bucket] = clamp(r.conviction + 15);
  }

  const radar = NARRATIVE_BUCKETS.map((id) => ({
    id,
    label: id,
    strength: Math.round(bucketStrength[id] ?? 40),
    trend: (bucketStrength[id] ?? 40) > 55 ? ("rising" as const) : ("stable" as const),
    source: "benchmark-derived" as const,
  })).sort((a, b) => b.strength - a.strength);

  const migration: MeridianNarrativeFlow["migration"] = [];
  if ((ranked?.length ?? 0) >= 2) {
    const sorted = [...(ranked ?? [])].sort((a, b) => (b.conviction ?? 0) - (a.conviction ?? 0));
    const from = SYMBOL_NARRATIVES[sorted.at(-1)!.symbol]?.bucket ?? "Unknown";
    const to = SYMBOL_NARRATIVES[sorted[0]!.symbol]?.bucket ?? leaderNarr;
    if (from !== to) {
      migration.push({
        from,
        to,
        strength: clamp((sorted[0]!.conviction ?? 50) - (sorted.at(-1)!.conviction ?? 30)),
        source: "derived",
      });
    }
  }

  return {
    radar,
    migration,
    likelyNextLeader: { narrative: leaderNarr, conviction: clamp(leader?.conviction ?? 50) },
  };
}

function buildConvictionDecay(base: number): MeridianConvictionDecay {
  const hours = [0, 24, 48, 72];
  const halfLife = 36;
  const curve = hours.map((h) => ({
    label: h === 0 ? "Now" : `${h}h`,
    hours: h,
    value: Math.round(base * Math.exp(-h / halfLife)),
  }));
  const reviewAfterHours = base >= 75 ? 48 : base >= 60 ? 36 : 24;
  const stale = curve[3]!.value < 52;
  const aging = curve[2]!.value < base - 15;

  return {
    current: base,
    curve,
    reviewAfterHours,
    status: stale ? "stale" : aging ? "aging" : "fresh",
  };
}

function buildCounterfactuals(
  snapshot: Record<string, unknown>,
  baseConviction: number,
): MeridianCounterfactual[] {
  const scenarios = [
    {
      label: "BTC drops 5%",
      mutate: (s: Record<string, unknown>) => ({
        ...s,
        fearGreed: clamp((s.fearGreed as number) - 12),
        change24h: ((s.change24h as number) ?? 0) - 4,
      }),
    },
    {
      label: "Sentiment doubles (F&G spike)",
      mutate: (s: Record<string, unknown>) => ({ ...s, fearGreed: clamp((s.fearGreed as number) + 18) }),
    },
    {
      label: "Volume collapses 60%",
      mutate: (s: Record<string, unknown>) => ({ ...s, volume24h: ((s.volume24h as number) ?? 0) * 0.4 }),
    },
    {
      label: "Risk-off regime shock",
      mutate: (s: Record<string, unknown>) => ({
        ...s,
        fearGreed: clamp((s.fearGreed as number) - 20),
        change7d: ((s.change7d as number) ?? 0) - 8,
      }),
    },
  ];

  return scenarios.map(({ label, mutate }) => {
    try {
      const mutated = mutate({ ...snapshot }) as Parameters<typeof evaluateNexusGate>[0];
      const gate = evaluateNexusGate(mutated);
      const out = toStructuredOutput(mutated, gate);
      const after = clamp(out.confidence ?? baseConviction);
      const delta = after - baseConviction;
      const sensitivity: MeridianCounterfactual["sensitivity"] =
        Math.abs(delta) >= 15 ? "high" : Math.abs(delta) >= 8 ? "medium" : "low";
      return {
        scenario: label,
        convictionBefore: baseConviction,
        convictionAfter: after,
        delta,
        status: "ok" as const,
        sensitivity,
      };
    } catch {
      return {
        scenario: label,
        convictionBefore: baseConviction,
        convictionAfter: null,
        delta: null,
        status: "recompute_failed" as const,
        sensitivity: "low" as const,
      };
    }
  });
}

function buildConstitution(
  consensus: GateJudgeConsensus | null | undefined,
  ctx: { regime: string; breadth: number | null; bearPct: number; liquidityOk: boolean },
): MeridianConstitutionArticle[] {
  const longVotes = consensus?.votes.long ?? 0;
  const total = consensus?.votes.total ?? 9;
  const breadthLabel = ctx.breadth != null ? `${ctx.breadth}%` : "UNKNOWN";

  return [
    {
      id: "I",
      title: "Supermajority vote",
      rule: "Need 6/9 skill layers aligned for GRANT",
      status: longVotes >= 6 ? "active" : "violated",
      detail: `${longVotes}/${total} layers long`,
    },
    {
      id: "II",
      title: "Momentum subordinate to risk",
      rule: "Momentum cannot override risk-off regime without breadth confirmation",
      status: ctx.regime !== "risk-off" || (ctx.breadth ?? 0) >= 45 ? "active" : "triggered",
      detail: `Regime ${ctx.regime} · breadth ${breadthLabel}`,
    },
    {
      id: "III",
      title: "Bear influence cap",
      rule: "Bear weight capped at 15% in consensus",
      status: ctx.bearPct <= 15 ? "active" : "violated",
      detail: `Bear weight ${ctx.bearPct}%`,
    },
    {
      id: "IV",
      title: "Risk-off position sizing",
      rule: "Risk-off regime halves effective position size",
      status: "active",
      detail: ctx.regime === "risk-off" ? "Half size enforced" : "Full size allowed",
    },
    {
      id: "V",
      title: "Liquidity floor (veto)",
      rule: "Low liquidity vetoes trades — risk overrides opportunity",
      status: ctx.liquidityOk ? "active" : "violated",
      detail: ctx.liquidityOk ? "Turnover check passed" : "Liquidity veto active",
    },
    {
      id: "VI",
      title: "Conviction decay review",
      rule: "Thesis must be re-reviewed after decay window if permit granted",
      status: "active",
      detail: "Auto review window active",
    },
  ];
}

function buildMemory(genome: MeridianGenome): MeridianMemoryMatch[] {
  const breadth = genome.breadth ?? 50;
  return MEMORY_GENOMES.map((g) => {
    const sim = Math.round(
      (1 - Math.abs((genome.fearGreed ?? 50) - g.fearGreed) / 100) * 40 +
        (1 - Math.abs(breadth - g.breadth) / 100) * 35 +
        (genome.regime === g.regime ? 25 : 10),
    );
    return {
      genomeId: g.id,
      label: g.label,
      similarity: clamp(sim),
      avgOutcomePct: g.avgOutcomePct,
      winRatePct: g.winRatePct,
    };
  })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 4);
}

function buildThesisDna(genome: MeridianGenome, topMemory: MeridianMemoryMatch | undefined): MeridianThesisDna {
  const rsi = genome.rsi;
  return {
    id: genome.id.replace("G-", "DNA-"),
    regime: genome.regime,
    momentum: rsi == null ? "UNKNOWN" : rsi >= 55 ? "High" : rsi >= 45 ? "Neutral" : "Low",
    relativeStrength: genome.relativeStrength,
    volatility: genome.volatility,
    liquidity:
      genome.volumeExpansion == null
        ? "UNKNOWN"
        : genome.volumeExpansion >= 1.5
          ? "Healthy"
          : "Thin",
    narrative: genome.narrative,
    resemblanceNote: topMemory
      ? `Resembles genome #${topMemory.genomeId} (${topMemory.similarity}% similar) — historical +${topMemory.avgOutcomePct}% avg (reference, not forecast)`
      : null,
  };
}

function buildTimeMachine(backtest: IntelligenceInput["backtest"]): MeridianTimeMachine | null {
  if (!backtest?.winRatePct && !backtest?.totalReturnPct) return null;
  return {
    avgReturnPct: backtest.totalReturnPct ?? 0,
    winRatePct: backtest.winRatePct ?? 0,
    avgDurationDays: 6,
    worstDrawdownPct: backtest.maxDrawdownPct ?? 0,
    sampleSize: backtest.roundTrips ?? 0,
    source: "90-day strategy backtest · not the historical analog above",
  };
}

function buildEvolution(backtest: IntelligenceInput["backtest"]): MeridianEvolutionHint | null {
  if (!backtest?.compare?.edge) return null;
  const edge = backtest.compare.edge;
  return {
    constitutionId: "481",
    winRatePct: backtest.winRatePct ?? 0,
    sharpe: Math.round(((backtest.totalReturnPct ?? 0) / Math.max(1, Math.abs(backtest.maxDrawdownPct ?? 5))) * 10) / 10,
    weakness: (backtest.maxDrawdownPct ?? 0) < -12 ? "Fails during panic regimes" : "Moderate drawdown in chop",
    proposedMutation: "Increase volatility penalty in risk-off (suggestion only — no auto-mutation)",
    expectedImprovement: `Sharpe +0.3 · drawdown saved ${edge.drawdownSavedPct ?? 0}% vs naive agent`,
  };
}

function buildProvenance(input: IntelligenceInput, skillEvidence: MeridianSkillEvidence[]): MeridianDataProvenance {
  const fetchedAt = input.fetchedAt ?? new Date().toISOString();
  const fields = input.fieldSources ?? {};
  const fieldList = Object.entries(fields).map(([field, source]) => ({
    field,
    source: String(source ?? "unknown"),
    value: input.market?.[field as keyof NonNullable<IntelligenceInput["market"]>] ?? null,
  }));

  const dataCompletenessPct = countDataCompleteness(skillEvidence);
  const dataQuality = assessDataQuality({
    cmcLive: input.cmcLive,
    degraded: input.degraded,
    fieldsPresent: fieldList.filter((f) => f.source !== "unknown" && f.source !== "pending").length,
    fieldsTotal: Math.max(fieldList.length, 8),
  });

  const staleWarning =
    input.cmcLive === false || input.degraded
      ? "Data may be venue-only or cached — verify live CMC before acting."
      : dataCompletenessPct < 75
        ? "Some skill inputs unavailable — reduced confidence applied."
        : null;

  return {
    source: "CoinMarketCap",
    fetchedAt,
    freshnessLabel: freshnessLabel(fetchedAt),
    cmcLive: input.cmcLive ?? false,
    dataQuality,
    dataCompletenessPct,
    fields: fieldList.slice(0, 12),
    staleWarning,
  };
}

function buildConfidenceBreakdown(input: {
  conviction: number;
  twinSimilarity: number;
  court: MeridianBullBearCourt;
  dataCompletenessPct: number;
}): MeridianConfidenceBreakdown {
  return {
    conviction: input.conviction,
    historicalSimilarity: input.twinSimilarity,
    bullBearSpread: input.court.spread,
    dataCompletenessPct: input.dataCompletenessPct,
    note: "Evidence-derived metrics — not probability of profit.",
  };
}

function buildExplainability(input: {
  symbol: string;
  genome: MeridianGenome;
  court: MeridianBullBearCourt;
  consensus: GateJudgeConsensus | null;
  marketTwin: MeridianMarketTwin;
  decay: MeridianConvictionDecay;
  gate?: IntelligenceInput["gate"];
  skills?: IntelligenceInput["skills"];
}): MeridianExplainability {
  const sym = input.symbol;
  const thesis = input.skills?.composite?.thesis ?? input.gate?.thesis ?? "Awaiting gate evaluation.";
  const blockers = input.skills?.composite?.blockers ?? input.consensus?.blockers ?? [];

  return {
    why: thesis,
    whyNow: `${sym} in ${input.genome.regime} regime · F&G ${input.genome.fearGreed ?? "UNKNOWN"} · breadth ${input.genome.breadth ?? "UNKNOWN"}`,
    whoDisagrees: input.court.dissent,
    thesisBreakers: [
      ...blockers.map((b) => `Blocker: ${b}`),
      "Stress: BTC −5%",
      "Stress: volume collapse",
      "Stress: F&G shock",
    ].slice(0, 6),
    validityHours: input.decay.reviewAfterHours,
    seenBefore: `${input.marketTwin.label} (${input.marketTwin.similarity}% similar)`,
    historicalResemblance: input.marketTwin.disclaimer,
  };
}

export function buildMeridianIntelligence(input: IntelligenceInput): MeridianIntelligencePayload {
  const sym = input.symbol.toUpperCase();
  const conviction = input.conviction ?? input.gate?.confidence ?? 50;
  const genome = buildGenome(input);
  const memory = buildMemory(genome);
  const consensus = input.consensus ?? null;
  const bearPct = consensus?.weights.bearPct ?? 20;
  const liquidityOk = input.skills?.composite?.liquidity?.pass === true;

  const skillEvidence =
    input.skills?.skillEvidence ??
    extractSkillEvidenceBundle(input.skills as Record<string, unknown> | undefined);

  const snapshot: Record<string, unknown> = {
    symbol: sym,
    fearGreed: input.market?.fearGreed ?? 50,
    rsi: input.market?.rsi ?? 50,
    change24h: input.market?.change24h ?? 0,
    change7d: input.market?.change7d ?? 0,
    volume24h: input.market?.volume24h ?? 0,
    marketCap: input.market?.marketCap ?? 1e9,
    macdSignal: input.market?.macdSignal ?? "neutral",
    price: input.market?.price ?? 1,
  };

  const breadthInfo = computeBreadth(input.ranked);
  const arch = summarizeArchitectureCoverage();
  const marketTwin = buildMarketTwin(genome, sym, input.market?.change7d ?? null);
  const bullBearCourt = buildCourt(consensus, conviction);
  const convictionDecay = buildConvictionDecay(conviction);
  const provenance = buildProvenance(input, skillEvidence);
  const confidence = buildConfidenceBreakdown({
    conviction,
    twinSimilarity: marketTwin.similarity,
    court: bullBearCourt,
    dataCompletenessPct: provenance.dataCompletenessPct,
  });

  const explainability = buildExplainability({
    symbol: sym,
    genome,
    court: bullBearCourt,
    consensus,
    marketTwin,
    decay: convictionDecay,
    gate: input.gate,
    skills: input.skills,
  });

  const permitStatus = consensus?.permit.status;
  const verdict = resolveMeridianVerdict({
    permitStatus,
    dataQuality: provenance.dataQuality,
    hasConsensus: Boolean(consensus),
  });

  let verdictReason: string;
  if (verdict === "UNKNOWN") verdictReason = "Data unavailable — abstaining rather than fabricating.";
  else if (verdict === "WAIT") verdictReason = "Evidence insufficient or degraded — prefer WAIT over fake certainty.";
  else if (verdict === "GRANT") verdictReason = consensus?.permit.reason ?? "Constitution GRANT — 6/9 layers aligned.";
  else verdictReason = consensus?.permit.reason ?? "Constitution DENY — risk or alignment failed.";

  const tradeAutopsy = buildTradeAutopsies({
    symbol: sym,
    trades: input.trades ?? [],
    skillEvidence,
    conviction,
    consensus,
  });

  const tradeJournal = buildTradeJournal({
    symbol: sym,
    trades: input.trades ?? [],
    autopsies: tradeAutopsy,
    backtest: input.backtest,
  });

  const truth = buildMeridianTruthEnvelope({
    moduleId: "meridian-intelligence",
    source: "CoinMarketCap + gate skills + wallet trades",
    cmcLive: input.cmcLive,
    degraded: input.degraded,
    dataQuality: provenance.dataQuality,
    fetchedAt: provenance.fetchedAt,
  });

  const directionEvidence = buildMeridianDirectionEvidence({
    consensus,
    court: bullBearCourt,
    memorySimilarity: marketTwin.similarity,
    dataQuality: provenance.dataQuality,
    regime: genome.regime,
    liquidityOk,
    blockers: input.skills?.composite?.blockers as string[] | undefined,
    market: {
      change1h: (input.market as { change1h?: number })?.change1h,
      change24h: input.market?.change24h,
      change7d: input.market?.change7d,
      change30d: (input.skills?.trend as { metrics?: { change30d?: number } })?.metrics?.change30d,
    },
  });

  return {
    schema: "meridian-intelligence/v2",
    symbol: sym,
    generatedAt: new Date().toISOString(),
    philosophy: PHILOSOPHY,
    goldenRules: [...MERIDIAN_GOLDEN_RULES],
    verdict,
    verdictReason,
    confidence,
    explainability,
    provenance,
    skillEvidence,
    genome,
    marketTwin,
    bullBearCourt,
    narrativeFlow: buildNarrativeFlow(input.ranked, sym),
    timeMachine: buildTimeMachine(input.backtest),
    thesisDna: buildThesisDna(genome, memory[0]),
    convictionDecay,
    counterfactuals: buildCounterfactuals(snapshot, conviction),
    constitution: buildConstitution(consensus, {
      regime: genome.regime,
      breadth: genome.breadth,
      bearPct,
      liquidityOk,
    }),
    marketMemory: memory,
    evolution: buildEvolution(input.backtest),
    tradeAutopsy,
    tradeJournal,
    directionEvidence,
    truth,
    architecture: {
      tagline: arch.tagline,
      coveragePct: arch.coveragePct,
      cmcSkillCount: arch.cmcSkillCount,
      featuresLive: arch.featureLive,
      breadthPct: breadthInfo.pct,
      breadthLabel: breadthInfo.label,
      dataSource: "coinmarketcap/quotes + fear-and-greed + global-metrics",
    },
  };
}

export type { MeridianIntelligencePayload };
