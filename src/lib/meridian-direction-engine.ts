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

/**
 * Nine decision layers — hierarchy-weighted (sum 100).
 * L1 regime + structure dominate; L2 trend/momentum/RS; L3 liquidity/sentiment.
 * Risk overrides opportunity via veto paths.
 */
export const MERIDIAN_DECISION_LAYER_WEIGHTS = {
  regime: 20,
  structure: 16,
  trend: 12,
  momentum: 10,
  relativeStrength: 10,
  liquidity: 8,
  narrative: 6,
  memory: 8,
  court: 10,
} as const;

/** @deprecated use MERIDIAN_DECISION_LAYER_WEIGHTS */
export const MERIDIAN_DIRECTION_LAYER_WEIGHTS = MERIDIAN_DECISION_LAYER_WEIGHTS;

/** Real CMC percent-change windows — one stable vote per window (no fabricated sub-hour bars) */
export const MERIDIAN_DECISION_TIMEFRAMES = [
  { tf: "1h", bucket: "intraday" as const, source: "live-cmc" as const },
  { tf: "24h", bucket: "intraday" as const, source: "live-cmc" as const },
  { tf: "7d", bucket: "swing" as const, source: "live-cmc" as const },
  { tf: "30d", bucket: "position" as const, source: "live-cmc" as const },
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

function voteFromChange(
  tf: string,
  ch: number | undefined,
  bucket: MeridianTimeHorizonBucket,
  source: "live-cmc" | "planned",
  threshold = 1.2,
): MeridianTimeframeVote {
  if (ch == null || Number.isNaN(ch)) return { timeframe: tf, direction: "NEUTRAL", bucket, source };
  if (ch >= threshold) return { timeframe: tf, direction: "LONG", bucket, source };
  if (ch <= -threshold) return { timeframe: tf, direction: "SHORT", bucket, source };
  return { timeframe: tf, direction: "FLAT", bucket, source };
}

/**
 * Real CMC percent-change windows only — each vote is ONE live number with a
 * meaningful neutral band, so it stays stable across refreshes (no flicker, no
 * fabricated sub-hour granularity). Missing window → NEUTRAL / DATA UNAVAILABLE.
 */
function buildTimeframeVotes(input: {
  change1h?: number;
  change24h?: number;
  change7d?: number;
  change30d?: number;
}): MeridianTimeframeVote[] {
  return [
    voteFromChange("1h", input.change1h, "intraday", "live-cmc", 0.45),
    voteFromChange("24h", input.change24h, "intraday", "live-cmc", 1.2),
    voteFromChange("7d", input.change7d, "swing", "live-cmc", 2.8),
    voteFromChange("30d", input.change30d, "position", "live-cmc", 5.5),
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
    scalping: "Intraday · 1h",
    "short-term": "Intraday · 1h",
    intraday: "Intraday · 1h–24h",
    swing: "Swing · 7d",
    position: "Position · 30d",
    mixed: "Mixed horizon — windows disagree",
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
    "WAIT is valid — horizons may disagree. Lower timeframes time entries; higher timeframes set context.";

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

  const STRONG = 62;
  const TACTICAL = 50;
  const WEAK = 42;
  const MAX_UNCERTAIN = 38;

  const longLayers = layers.filter((l) => l.signal === "ENTER_LONG").length;
  const bearLayers = layers.filter((l) => l.signal === "EXIT" || l.signal === "AVOID").length;

  let verdict: MeridianEvidenceDirection = "FLAT";
  let verdictLabel = "WAIT — mixed or weak evidence";

  const hasHardVeto =
    input.liquidityOk === false ||
    (input.blockers?.length ?? 0) > 0 ||
    input.regime === "risk-off";

  if (hasHardVeto) {
    verdict = "FLAT";
    verdictLabel = "WAIT — risk or structure veto (no edge)";
  } else if (
    longLayers >= 7 &&
    longScore >= STRONG &&
    shortScore <= WEAK &&
    uncertainty <= MAX_UNCERTAIN &&
    longScore - shortScore >= 12
  ) {
    verdict = input.consensus?.permit.status === "GRANT" && input.consensus.cleared ? "LONG" : "FLAT";
    verdictLabel =
      verdict === "LONG" ? "Strong Long — 7+ layers aligned" : "Tactical Long lean — permit not cleared";
  } else if (
    longLayers >= 5 &&
    longScore >= TACTICAL &&
    shortScore <= WEAK + 8 &&
    longScore > shortScore + 6
  ) {
    verdict =
      input.consensus?.permit.status === "GRANT" && input.consensus.cleared
        ? "LONG"
        : conflict === "high"
          ? "FLAT"
          : "FLAT";
    verdictLabel =
      verdict === "LONG"
        ? "Tactical Long — 5–6 layers agree"
        : "Tactical Long lean — WAIT for permit or lower conflict";
  } else if (
    bearLayers >= 7 &&
    shortScore >= STRONG &&
    longScore <= WEAK &&
    shortScore - longScore >= 12
  ) {
    verdict = "SHORT";
    verdictLabel = "Strong Short — bear stack dominant";
  } else if (bearLayers >= 5 && shortScore >= TACTICAL && shortScore > longScore + 6) {
    verdict = "SHORT";
    verdictLabel = "Tactical Short — de-risk bias";
  } else if (conflict === "high") {
    verdict = "FLAT";
    verdictLabel = "WAIT — layers disagree; no forced alignment";
  } else {
    verdict = "FLAT";
    verdictLabel = "WAIT — no actionable edge";
  }

  if (input.dataQuality === "degraded" && conflict === "high") {
    verdict = "FLAT";
    verdictLabel = "WAIT — degraded data; abstain";
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
