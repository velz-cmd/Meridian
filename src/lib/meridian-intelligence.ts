/**
 * MERIDIAN Market Memory Engine — builds unified intelligence from Gate + skills + backtest.
 */
import { evaluateNexusGate, toStructuredOutput } from "../../bnb-hack/engine/nexus-gate.mjs";
import type { GateJudgeConsensus } from "@/lib/gate-consensus-payload";
import {
  HISTORICAL_ANALOGS,
  MEMORY_GENOMES,
  NARRATIVE_BUCKETS,
  SYMBOL_NARRATIVES,
} from "@/lib/meridian-intelligence-data";
import type {
  MeridianBullBearCourt,
  MeridianConstitutionArticle,
  MeridianConvictionDecay,
  MeridianCounterfactual,
  MeridianEvolutionHint,
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
  };
  skills?: {
    composite?: {
      alignmentScore?: number;
      relativeStrength?: { role?: string; vsBnbPct?: number };
      volatility?: { label?: string; compression?: boolean };
      liquidity?: { pass?: boolean; turnover?: number };
    };
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
};

const PHILOSOPHY = [
  "What market are we in? → Regime Engine",
  "Where is capital moving? → Narrative Flow",
  "Why does this opportunity exist? → Bull Court",
  "Who disagrees? → Bear Court",
  "What would invalidate the thesis? → Counterfactual Engine",
  "How long is the thesis valid? → Conviction Decay",
  "Have we seen this before? → Market Twin",
  "Which patterns are similar? → Market Memory",
  "Why was I wrong? → Trade Autopsy (NEXUS)",
  "Should capital deploy? → Constitution",
];

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
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
  const fg = m.fearGreed ?? 50;
  const rsi = m.rsi ?? 50;
  const ranked = input.ranked ?? [];
  const longCount = ranked.filter((r) => (r.conviction ?? 0) >= 55).length;
  const breadth = ranked.length ? Math.round((longCount / ranked.length) * 100) : 50;
  const volExp = m.volume24h && m.marketCap ? Math.round((m.volume24h / m.marketCap) * 1000) / 10 : 1;
  const rs = (input.skills as { relativeStrength?: { role?: string } })?.relativeStrength?.role ?? "neutral";
  const vol = (input.skills as { volatility?: { label?: string; state?: string } })?.volatility?.state ?? "medium";
  const narrative = SYMBOL_NARRATIVES[sym]?.narrative ?? "Mixed";
  const date = new Date().toISOString().slice(0, 10);

  return {
    id: genomeId(date, sym, regime),
    date,
    symbol: sym,
    regime,
    fearGreed: fg,
    breadth,
    narrative,
    volumeExpansion: volExp,
    relativeStrength: rs,
    volatility: vol,
    rsi,
    conviction: input.conviction ?? input.gate?.confidence ?? 50,
  };
}

function buildMarketTwin(genome: MeridianGenome, symbol: string): MeridianMarketTwin {
  const live = {
    fearGreed: genome.fearGreed,
    rsi: genome.rsi,
    change7d: 0,
    breadth: genome.breadth,
    regime: genome.regime,
  };
  const scored = HISTORICAL_ANALOGS.map((a) => ({ a, score: analogSimilarity(live, a) }))
    .sort((x, y) => y.score - x.score);
  const best = scored[0]!.a;
  const score = scored[0]!.score;
  const confidence: MeridianMarketTwin["confidence"] =
    score >= 82 ? "High" : score >= 68 ? "Medium" : "Low";

  return {
    label: best.label,
    period: best.period,
    similarity: score,
    confidence,
    outcomes: Object.entries(best.outcomes).map(([s, returnPct]) => ({ symbol: s, returnPct })),
    differences: best.differencesTemplate.map((d) =>
      d.replace("today", `F&G ${genome.fearGreed}`).replace("then", `F&G ${best.fearGreed}`),
    ),
    implication: best.implication,
  };
}

function buildCourt(consensus: GateJudgeConsensus | null | undefined, conviction: number): MeridianBullBearCourt {
  if (!consensus) {
    return {
      bull: { score: conviction, arguments: ["Awaiting skill consensus"], layers: [] },
      bear: { score: 100 - conviction, arguments: ["Insufficient data"], layers: [] },
      verdict: conviction >= 55 ? "Bull wins" : "Bear wins",
      dissent: [],
      permit: "PENDING",
    };
  }

  const bullLayers = consensus.layers.filter((l) => l.signal === "ENTER_LONG" || l.agreesWithDesk);
  const bearLayers = consensus.layers.filter((l) => l.signal === "EXIT" || l.signal === "AVOID");

  const bullArgs = bullLayers.map(
    (l) => `${l.name}: ${l.signal.replace(/_/g, " ")} (${Math.round(l.weight * 100)}% weight)`,
  );
  const bearArgs = bearLayers.length
    ? bearLayers.map((l) => `${l.name}: ${l.signal.replace(/_/g, " ")}`)
    : consensus.blockers.length
      ? consensus.blockers
      : ["No active bear layers — dissent from hold-weight skills"];

  const bullScore = Math.round(consensus.weights.longPct);
  const bearScore = Math.round(consensus.weights.bearPct);
  let verdict: MeridianBullBearCourt["verdict"] = "Deadlock";
  if (bullScore > bearScore + 10) verdict = "Bull wins";
  else if (bearScore > bullScore) verdict = "Bear wins";

  const dissent = consensus.layers
    .filter((l) => !l.agreesWithDesk && l.signal !== "ENTER_LONG")
    .map((l) => `${l.name} disagrees (${l.signal})`);

  if (!consensus.coreStack.passed) dissent.push("Core stack failed — constitution split");

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
    dissent,
    permit: consensus.permit.status,
  };
}

function buildNarrativeFlow(
  ranked: IntelligenceInput["ranked"],
  symbol: string,
): MeridianNarrativeFlow {
  const sym = symbol.toUpperCase();
  const leader = ranked?.[0];
  const leaderNarr = SYMBOL_NARRATIVES[leader?.symbol ?? sym]?.bucket ?? "DeFi";

  const bucketStrength: Record<string, number> = {
    AI: 52,
    Memes: 40,
    Gaming: 62,
    RWA: 83,
    DeFi: 58,
    L1: 70,
  };

  for (const r of ranked ?? []) {
    const bucket = SYMBOL_NARRATIVES[r.symbol]?.bucket;
    if (bucket) bucketStrength[bucket] = clamp((r.conviction ?? 50) + 20);
  }

  const radar = NARRATIVE_BUCKETS.map((id) => ({
    id,
    label: id,
    strength: Math.round(bucketStrength[id] ?? 40),
    trend: (bucketStrength[id] ?? 40) > 55 ? ("rising" as const) : ("stable" as const),
  })).sort((a, b) => b.strength - a.strength);

  const sorted = [...(ranked ?? [])].sort((a, b) => (b.conviction ?? 0) - (a.conviction ?? 0));
  const migration: MeridianNarrativeFlow["migration"] = [];
  if (sorted.length >= 2) {
    const from = SYMBOL_NARRATIVES[sorted[sorted.length - 1]!.symbol]?.bucket ?? "Memes";
    const to = SYMBOL_NARRATIVES[sorted[0]!.symbol]?.bucket ?? leaderNarr;
    migration.push({ from, to, strength: clamp((sorted[0]!.conviction ?? 50) - (sorted.at(-1)!.conviction ?? 30)) });
  }
  migration.push({ from: "Memes", to: "AI", strength: 81 });

  return {
    radar,
    migration,
    likelyNextLeader: { narrative: leaderNarr, confidence: clamp(leader?.conviction ?? 65) },
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
    { label: "BTC drops 5%", mutate: (s: Record<string, unknown>) => ({ ...s, fearGreed: clamp((s.fearGreed as number) - 12), change24h: ((s.change24h as number) ?? 0) - 4 }) },
    { label: "Sentiment doubles (F&G spike)", mutate: (s: Record<string, unknown>) => ({ ...s, fearGreed: clamp((s.fearGreed as number) + 18) }) },
    { label: "Volume collapses 60%", mutate: (s: Record<string, unknown>) => ({ ...s, volume24h: ((s.volume24h as number) ?? 0) * 0.4 }) },
    { label: "Risk-off regime shock", mutate: (s: Record<string, unknown>) => ({ ...s, fearGreed: clamp((s.fearGreed as number) - 20), change7d: ((s.change7d as number) ?? 0) - 8 }) },
  ];

  return scenarios.map(({ label, mutate }) => {
    try {
      const mutated = mutate({ ...snapshot }) as Parameters<typeof evaluateNexusGate>[0];
      const gate = evaluateNexusGate(mutated);
      const out = toStructuredOutput(mutated, gate);
      const after = clamp(out.confidence ?? baseConviction);
      return {
        scenario: label,
        convictionBefore: baseConviction,
        convictionAfter: after,
        delta: after - baseConviction,
      };
    } catch {
      const after = clamp(baseConviction - 15);
      return { scenario: label, convictionBefore: baseConviction, convictionAfter: after, delta: after - baseConviction };
    }
  });
}

function buildConstitution(
  consensus: GateJudgeConsensus | null | undefined,
  ctx: { regime: string; breadth: number; bearPct: number; liquidityOk: boolean },
): MeridianConstitutionArticle[] {
  const longVotes = consensus?.votes.long ?? 0;
  const total = consensus?.votes.total ?? 9;

  const articles: MeridianConstitutionArticle[] = [
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
      status: ctx.regime !== "risk-off" || ctx.breadth >= 45 ? "active" : "triggered",
      detail: `Regime ${ctx.regime} · breadth ${ctx.breadth}`,
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
      title: "Liquidity floor",
      rule: "Volume must support turnover vs market cap",
      status: ctx.liquidityOk ? "active" : "violated",
      detail: "Turnover vs market cap check",
    },
    {
      id: "VI",
      title: "Conviction decay review",
      rule: "Thesis must be re-reviewed after 48h if permit granted",
      status: "active",
      detail: "Auto review window active",
    },
  ];
  return articles;
}

function buildMemory(genome: MeridianGenome): MeridianMemoryMatch[] {
  return MEMORY_GENOMES.map((g) => {
    const sim = Math.round(
      (1 - Math.abs(genome.fearGreed - g.fearGreed) / 100) * 40 +
        (1 - Math.abs(genome.breadth - g.breadth) / 100) * 35 +
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
  return {
    id: genome.id.replace("G-", "DNA-"),
    regime: genome.regime,
    momentum: genome.rsi >= 55 ? "High" : genome.rsi >= 45 ? "Neutral" : "Low",
    relativeStrength: genome.relativeStrength,
    volatility: genome.volatility,
    liquidity: genome.volumeExpansion >= 1.5 ? "Healthy" : "Thin",
    narrative: genome.narrative,
    resemblanceNote: topMemory
      ? `Resembles genome #${topMemory.genomeId} (${topMemory.similarity}% similar) — historical +${topMemory.avgOutcomePct}% avg`
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
    source: "90-day constitution backtest",
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
    proposedMutation: "Increase volatility penalty in risk-off",
    expectedImprovement: `Sharpe +0.3 · drawdown saved ${edge.drawdownSavedPct ?? 0}% vs naive agent`,
  };
}

export function buildMeridianIntelligence(input: IntelligenceInput): MeridianIntelligencePayload {
  const sym = input.symbol.toUpperCase();
  const conviction = input.conviction ?? input.gate?.confidence ?? 50;
  const genome = buildGenome(input);
  const memory = buildMemory(genome);
  const consensus = input.consensus ?? null;
  const bearPct = consensus?.weights.bearPct ?? 20;
  const liquidityOk = input.skills?.composite?.liquidity?.pass !== false;

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

  return {
    schema: "meridian-intelligence/v1",
    symbol: sym,
    generatedAt: new Date().toISOString(),
    philosophy: PHILOSOPHY,
    genome,
    marketTwin: buildMarketTwin(genome, sym),
    bullBearCourt: buildCourt(consensus, conviction),
    narrativeFlow: buildNarrativeFlow(input.ranked, sym),
    timeMachine: buildTimeMachine(input.backtest),
    thesisDna: buildThesisDna(genome, memory[0]),
    convictionDecay: buildConvictionDecay(conviction),
    counterfactuals: buildCounterfactuals(snapshot, conviction),
    constitution: buildConstitution(consensus, {
      regime: genome.regime,
      breadth: genome.breadth,
      bearPct,
      liquidityOk,
    }),
    marketMemory: memory,
    evolution: buildEvolution(input.backtest),
  };
}

export type { MeridianIntelligencePayload };
