/**
 * MERIDIAN Decision Engine — synthesizes evidence into LONG / SHORT / FLAT.
 * MERIDIAN does not predict. Direction emerges from weighted layers. No preferred direction.
 * Router verdict on Overview is separate execution truth; this engine publishes evidence scores.
 */
import type { GateJudgeConsensus } from "@/lib/gate-consensus-payload";
import type { MeridianDataQuality } from "@/lib/meridian-philosophy";
import type { MeridianBullBearCourt } from "@/lib/meridian-intelligence-types";

export type MeridianEvidenceDirection = "LONG" | "SHORT" | "FLAT" | "WAIT";

export type MeridianDirectionConflict = "low" | "moderate" | "high";

export type MeridianTimeHorizonBucket =
  | "scalping"
  | "short-term"
  | "intraday"
  | "swing"
  | "position"
  | "mixed";

/** Nine decision layers — weights sum to 100. Regime and liquidity have veto paths. */
export const MERIDIAN_DECISION_LAYER_WEIGHTS = {
  regime: 14,
  trend: 13,
  momentum: 11,
  liquidity: 12,
  relativeStrength: 11,
  structure: 10,
  narrative: 9,
  memory: 10,
  court: 10,
} as const;

/** @deprecated use MERIDIAN_DECISION_LAYER_WEIGHTS */
export const MERIDIAN_DIRECTION_LAYER_WEIGHTS = MERIDIAN_DECISION_LAYER_WEIGHTS;

/** Multi-timeframe roadmap — micro cannot override swing without consensus */
export const MERIDIAN_DECISION_TIMEFRAMES = [
  { tf: "3m", bucket: "scalping" as const, source: "planned" as const },
  { tf: "5m", bucket: "scalping" as const, source: "planned" as const },
  { tf: "15m", bucket: "short-term" as const, source: "planned" as const },
  { tf: "30m", bucket: "short-term" as const, source: "planned" as const },
  { tf: "1h", bucket: "intraday" as const, source: "live-cmc" as const },
  { tf: "4h", bucket: "intraday" as const, source: "planned" as const },
  { tf: "12h", bucket: "swing" as const, source: "planned" as const },
  { tf: "1d", bucket: "swing" as const, source: "live-cmc" as const },
  { tf: "3d", bucket: "position" as const, source: "planned" as const },
  { tf: "1w", bucket: "position" as const, source: "planned" as const },
] as const;

const LAYER_BUCKET: Record<string, keyof typeof MERIDIAN_DECISION_LAYER_WEIGHTS | null> = {
  regime: "regime",
  trend: "trend",
  momentum: "momentum",
  liquidity: "liquidity",
  relativeStrength: "relativeStrength",
  structural: "structure",
  sentiment: "narrative",
  volatility: "regime",
  constitution: null,
};

export type MeridianTimeframeVote = {
  timeframe: string;
  direction: MeridianEvidenceDirection | "NEUTRAL";
  bucket: MeridianTimeHorizonBucket;
  source: "live-cmc" | "planned";
};

export type MeridianDirectionEvidence = {
  longScore: number;
  shortScore: number;
  holdScore: number;
  uncertainty: number;
  conflictScore: number;
  dataQualityScore: number;
  verdict: MeridianEvidenceDirection;
  verdictLabel: string;
  conflict: MeridianDirectionConflict;
  horizon: string;
  timeHorizonBucket: MeridianTimeHorizonBucket;
  vetoes: string[];
  timeframeVotes: MeridianTimeframeVote[];
  rationale: string;
  flatNote: string;
};

function signalContribution(signal: string): { long: number; short: number; hold: number } {
  if (signal === "ENTER_LONG") return { long: 100, short: 0, hold: 0 };
  if (signal === "EXIT" || signal === "AVOID") return { long: 0, short: 100, hold: 0 };
  if (signal === "HOLD") return { long: 0, short: 0, hold: 100 };
  return { long: 0, short: 0, hold: 60 };
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function dataQualityScoreFrom(q?: MeridianDataQuality): number {
  if (q === "complete") return 100;
  if (q === "partial") return 72;
  if (q === "degraded") return 45;
  return 0;
}

function voteFromChange(tf: string, ch: number | undefined, bucket: MeridianTimeHorizonBucket, source: "live-cmc" | "planned"): MeridianTimeframeVote {
  if (ch == null || Number.isNaN(ch)) return { timeframe: tf, direction: "NEUTRAL", bucket, source };
  if (ch >= 1.5) return { timeframe: tf, direction: "LONG", bucket, source };
  if (ch <= -1.5) return { timeframe: tf, direction: "SHORT", bucket, source };
  return { timeframe: tf, direction: "FLAT", bucket, source };
}

function buildTimeframeVotes(input: {
  change1h?: number;
  change24h?: number;
  change7d?: number;
  change30d?: number;
}): MeridianTimeframeVote[] {
  const planned = (tf: string, bucket: MeridianTimeHorizonBucket): MeridianTimeframeVote => ({
    timeframe: tf,
    direction: "NEUTRAL",
    bucket,
    source: "planned",
  });

  return [
    planned("3m", "scalping"),
    planned("5m", "scalping"),
    planned("15m", "short-term"),
    planned("30m", "short-term"),
    voteFromChange("1h", input.change1h, "intraday", "live-cmc"),
    planned("4h", "intraday"),
    planned("12h", "swing"),
    voteFromChange("1d", input.change24h, "swing", "live-cmc"),
    voteFromChange("3d", input.change7d, "position", "live-cmc"),
    voteFromChange("1w", input.change30d, "position", "live-cmc"),
  ];
}

function inferTimeHorizon(votes: MeridianTimeframeVote[]): { label: string; bucket: MeridianTimeHorizonBucket } {
  const live = votes.filter((v) => v.source === "live-cmc" && v.direction !== "NEUTRAL");
  const bucketCounts = new Map<MeridianTimeHorizonBucket, number>();
  for (const v of live) {
    bucketCounts.set(v.bucket, (bucketCounts.get(v.bucket) ?? 0) + 1);
  }

  let topBucket: MeridianTimeHorizonBucket = "mixed";
  let topCount = 0;
  for (const [bucket, count] of bucketCounts) {
    if (count > topCount) {
      topCount = count;
      topBucket = bucket;
    }
  }

  const labels: Record<MeridianTimeHorizonBucket, string> = {
    scalping: "Scalping · 3m–5m",
    "short-term": "Short-term · 15m–30m",
    intraday: "Intraday · 1h–4h",
    swing: "Swing · 12h–1d",
    position: "Position · 3d–1w",
    mixed: "Mixed horizon — timeframe conflict",
  };

  const conflict = live.length >= 2 && new Set(live.map((v) => v.bucket)).size > 1;
  if (conflict && topCount <= 1) {
    return { label: labels.mixed, bucket: "mixed" };
  }

  return { label: labels[topBucket], bucket: topBucket };
}

function conflictLevel(spread: number, uncertainty: number, conflictScore: number): MeridianDirectionConflict {
  if (spread < 12 || uncertainty >= 35 || conflictScore >= 72) return "high";
  if (spread < 22 || uncertainty >= 22 || conflictScore >= 48) return "moderate";
  return "low";
}

export function buildMeridianDirectionEvidence(input: {
  consensus?: GateJudgeConsensus | null;
  court?: MeridianBullBearCourt | null;
  memorySimilarity?: number;
  dataQuality?: MeridianDataQuality;
  regime?: string;
  liquidityOk?: boolean;
  blockers?: string[];
  market?: { change1h?: number; change24h?: number; change7d?: number; change30d?: number };
}): MeridianDirectionEvidence {
  const flatNote =
    "FLAT is a position — not failure. MERIDIAN does not force LONG or SHORT when evidence is mixed.";

  const dataQualityScore = dataQualityScoreFrom(input.dataQuality);

  if (input.dataQuality === "unavailable") {
    return {
      longScore: 0,
      shortScore: 0,
      holdScore: 0,
      uncertainty: 100,
      conflictScore: 100,
      dataQualityScore: 0,
      verdict: "WAIT",
      verdictLabel: "WAIT — data unavailable",
      conflict: "high",
      horizon: "—",
      timeHorizonBucket: "mixed",
      vetoes: ["DATA UNAVAILABLE"],
      timeframeVotes: [],
      rationale: "Abstaining — no fabricated direction when feeds are missing.",
      flatNote,
    };
  }

  const vetoes: string[] = [];
  if (input.regime === "risk-off") vetoes.push("Regime risk-off — sizing reduced / flat preferred");
  if (input.liquidityOk === false) vetoes.push("Liquidity veto active");
  for (const b of input.blockers ?? []) vetoes.push(`Blocker: ${b}`);

  const timeframeVotes = buildTimeframeVotes(input.market ?? {});
  const { label: horizon, bucket: timeHorizonBucket } = inferTimeHorizon(timeframeVotes);

  let longAcc = 0;
  let shortAcc = 0;
  let holdAcc = 0;

  const layers = input.consensus?.layers ?? [];
  if (layers.length) {
    for (const layer of layers) {
      const bucket = LAYER_BUCKET[layer.id];
      if (!bucket) continue;
      const w = MERIDIAN_DECISION_LAYER_WEIGHTS[bucket];
      const c = signalContribution(layer.signal);
      longAcc += (w * c.long) / 100;
      shortAcc += (w * c.short) / 100;
      holdAcc += (w * c.hold) / 100;
    }
  } else if (input.consensus?.weights) {
    longAcc = input.consensus.weights.longPct;
    shortAcc = input.consensus.weights.bearPct;
    holdAcc = input.consensus.weights.holdPct;
  }

  if (input.memorySimilarity != null && input.memorySimilarity >= 60) {
    const memBoost = (input.memorySimilarity / 100) * MERIDIAN_DECISION_LAYER_WEIGHTS.memory;
    longAcc += memBoost * 0.6;
    holdAcc += memBoost * 0.4;
  }

  const courtDissent = input.court?.dissent?.length ?? 0;
  const courtSpread = input.court?.spread ?? 0;
  if (courtDissent > 0) holdAcc += Math.min(MERIDIAN_DECISION_LAYER_WEIGHTS.court, courtDissent * 4);
  if (courtSpread < 15) holdAcc += 6;

  let uncertainty = clamp(Math.round(holdAcc));
  if (input.dataQuality === "degraded" || input.dataQuality === "partial") {
    uncertainty = clamp(uncertainty + Math.round((100 - dataQualityScore) * 0.15));
  }

  if (input.consensus?.permit.status === "DENY" && input.consensus.cleared === false) {
    uncertainty = clamp(uncertainty + 8);
    if (!vetoes.some((v) => v.includes("Liquidity"))) {
      vetoes.push("Constitution DENY — execution remains flat");
    }
  }

  const longScore = clamp(Math.round(longAcc));
  const shortScore = clamp(Math.round(shortAcc));
  const holdScore = clamp(Math.round(holdAcc));
  const spread = Math.abs(longScore - shortScore);
  const conflictScore = clamp(Math.round(100 - spread + uncertainty * 0.25));
  const conflict = conflictLevel(spread, uncertainty, conflictScore);

  const STRONG = 68;
  const WEAK = 38;
  const MAX_UNCERTAIN = 28;

  let verdict: MeridianEvidenceDirection = "FLAT";
  let verdictLabel = "FLAT — mixed or weak evidence";

  const hasHardVeto =
    input.liquidityOk === false ||
    (input.blockers?.length ?? 0) > 0 ||
    input.regime === "risk-off";

  if (hasHardVeto || conflict === "high") {
    verdict = "FLAT";
    verdictLabel = "FLAT — disagreement or veto (disciplined abstention)";
  } else if (
    longScore >= STRONG &&
    shortScore <= WEAK &&
    uncertainty <= MAX_UNCERTAIN &&
    longScore - shortScore >= 18
  ) {
    verdict = input.consensus?.permit.status === "GRANT" && input.consensus.cleared ? "LONG" : "FLAT";
    verdictLabel =
      verdict === "LONG"
        ? "LONG — strong evidence"
        : "FLAT — long lean but constitution not cleared";
  } else if (
    shortScore >= STRONG &&
    longScore <= WEAK &&
    uncertainty <= MAX_UNCERTAIN &&
    shortScore - longScore >= 18
  ) {
    verdict = "SHORT";
    verdictLabel = "SHORT — de-risk / rotate evidence";
  } else if (longScore >= 55 && shortScore >= 45 && conflict !== "low") {
    verdict = "FLAT";
    verdictLabel = "FLAT — scores too close; conflict dominates";
  } else {
    verdict = "FLAT";
    verdictLabel = "FLAT — no strong directional edge";
  }

  if (input.dataQuality === "degraded" && conflict !== "low") {
    verdict = "FLAT";
    verdictLabel = "FLAT — degraded data; prefer abstention";
  }

  if (timeHorizonBucket === "mixed" && conflict !== "low") {
    verdict = "FLAT";
    verdictLabel = "FLAT — timeframe conflict; higher TF anchors horizon";
  }

  const rationale = [
    `Long ${longScore} · Short ${shortScore} · Hold ${holdScore}`,
    `Conflict ${conflictScore} · Uncertainty ${uncertainty}`,
    conflict !== "low" ? `Level ${conflict}` : null,
    vetoes.length ? vetoes[0] : null,
    horizon,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    longScore,
    shortScore,
    holdScore,
    uncertainty,
    conflictScore,
    dataQualityScore,
    verdict,
    verdictLabel,
    conflict,
    horizon,
    timeHorizonBucket,
    vetoes,
    timeframeVotes,
    rationale,
    flatNote,
  };
}

/** Alias — Decision Engine is the canonical name */
export const buildMeridianDecisionEvidence = buildMeridianDirectionEvidence;
