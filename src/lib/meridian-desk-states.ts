/**
 * MERIDIAN professional desk states — actionable vocabulary, not generic HOLD.
 * Internal engine keeps LONG / SHORT / FLAT; UI uses spot/futures desk language.
 */
import type { GateJudgeConsensus } from "@/lib/gate-consensus-payload";
import type { MeridianDirectionConflict } from "@/lib/meridian-direction-engine";
import type { MeridianBullBearCourt } from "@/lib/meridian-intelligence-types";
import type { GateHorizonId } from "@/lib/gate-desk-labels";

export type SpotDeskState = "ACCUMULATE" | "HOLD POSITION" | "WAIT" | "REDUCE" | "EXIT";
export type FuturesDeskState = "LONG" | "SHORT" | "WAIT" | "REDUCE" | "EXIT";
export type DeskVerdictTier = "Strong Long" | "Tactical Long" | "WAIT" | "Tactical Short" | "Strong Short";

export type ConvictionBand = "Strong edge" | "Good edge" | "Mixed" | "Weak" | "Avoid";
export type ConflictLevel = "Low" | "Medium" | "High";

export type FourPillarId = "regime" | "trend" | "relativeStrength" | "liquidity";

export type FourPillar = {
  id: FourPillarId;
  label: string;
  value: string;
  detail: string;
};

export type CourtDeskSummary = {
  bullScore: number;
  bearScore: number;
  holdScore: number;
  spread: number;
  conflict: ConflictLevel;
  verdict: DeskVerdictTier;
  note: string;
};

/** Evidence-strength bands — not probability. */
export function convictionBand(score: number | string | null | undefined): ConvictionBand {
  const n = typeof score === "number" ? score : Number(score);
  if (!Number.isFinite(n)) return "Mixed";
  if (n >= 80) return "Strong edge";
  if (n >= 65) return "Good edge";
  if (n >= 50) return "Mixed";
  if (n >= 35) return "Weak";
  return "Avoid";
}

export function convictionBandDetail(band: ConvictionBand): string {
  switch (band) {
    case "Strong edge":
      return "Evidence strongly aligned — size with discipline.";
    case "Good edge":
      return "Evidence favors action — normal sizing.";
    case "Mixed":
      return "Evidence mixed — abstain or reduce size.";
    case "Weak":
      return "Edge thin — prefer WAIT.";
    case "Avoid":
      return "Evidence too weak — no action.";
  }
}

/** Human review timer from engine hours. */
export function resolveReviewTimer(hours: number | null | undefined): string {
  const h = hours ?? 24;
  if (h <= 0.5) return "15 minutes";
  if (h <= 1.5) return "1 hour";
  if (h <= 5) return "4 hours";
  if (h <= 14) return "12 hours";
  if (h <= 30) return "Tomorrow";
  return "1 week";
}

export function resolveReviewHoursLabel(hours: number | null | undefined): string {
  return `Review · ${resolveReviewTimer(hours)}`;
}

const HORIZON_THRESHOLDS: Record<GateHorizonId, number> = {
  intraday: 0.45,
  daily: 1.2,
  swing: 2.8,
  position: 5.5,
};

/**
 * Map live CMC % change to a spot desk state for one horizon.
 * WAIT = no edge (not generic HOLD). Different horizons may disagree — that is normal.
 */
export function resolveHorizonSpotState(
  change: number | null | undefined,
  horizonId: GateHorizonId,
  hasOpenPosition = false,
): SpotDeskState {
  if (change == null || Number.isNaN(change)) return "WAIT";
  const threshold = HORIZON_THRESHOLDS[horizonId];
  const strong = threshold * 1.75;
  const soft = threshold * 0.35;

  if (change >= strong) return "ACCUMULATE";
  if (change >= threshold) {
    return horizonId === "intraday" ? "ACCUMULATE" : "ACCUMULATE";
  }
  if (change <= -strong) return "EXIT";
  if (change <= -threshold) return "REDUCE";
  if (hasOpenPosition && Math.abs(change) <= soft) return "HOLD POSITION";
  if (Math.abs(change) <= soft) return "WAIT";
  if (change > 0) return horizonId === "position" || horizonId === "swing" ? "ACCUMULATE" : "WAIT";
  return "REDUCE";
}

export function resolveHorizonFuturesState(
  change: number | null | undefined,
  horizonId: GateHorizonId,
): FuturesDeskState {
  const spot = resolveHorizonSpotState(change, horizonId);
  if (spot === "ACCUMULATE") return "LONG";
  if (spot === "EXIT") return "EXIT";
  if (spot === "REDUCE") return "REDUCE";
  if (spot === "HOLD POSITION") return "LONG";
  return "WAIT";
}

export function spotStateReason(state: SpotDeskState, changeLabel: string, horizonLabel: string): string {
  switch (state) {
    case "ACCUMULATE":
      return `${horizonLabel} ${changeLabel} — conditions favor adding exposure.`;
    case "HOLD POSITION":
      return `${horizonLabel} ${changeLabel} — trend intact, maintain existing size.`;
    case "WAIT":
      return `${horizonLabel} ${changeLabel} — no edge; abstain until evidence shifts.`;
    case "REDUCE":
      return `${horizonLabel} ${changeLabel} — momentum weakening; trim risk.`;
    case "EXIT":
      return `${horizonLabel} ${changeLabel} — thesis broken; leave position.`;
  }
}

export function resolveVerdictTier(input: {
  longScore: number;
  shortScore: number;
  longLayerCount: number;
  bearLayerCount: number;
  conviction: number;
  conflict: MeridianDirectionConflict;
  vetoes: string[];
  permit?: "GRANT" | "DENY" | "WAIT";
}): DeskVerdictTier {
  if (input.vetoes.length > 0 || input.conflict === "high") return "WAIT";

  const { longScore, shortScore, longLayerCount, bearLayerCount, conviction } = input;

  if (longLayerCount >= 7 && conviction >= 70 && longScore >= 62 && longScore - shortScore >= 12) {
    return "Strong Long";
  }
  if (longLayerCount >= 5 && conviction >= 55 && longScore >= 50 && longScore > shortScore + 6) {
    return "Tactical Long";
  }
  if (bearLayerCount >= 7 && conviction >= 70 && shortScore >= 62 && shortScore - longScore >= 12) {
    return "Strong Short";
  }
  if (bearLayerCount >= 5 && conviction >= 55 && shortScore >= 50 && shortScore > longScore + 6) {
    return "Tactical Short";
  }
  return "WAIT";
}

export function conflictLevelFromSpread(spread: number, dissentCount: number): ConflictLevel {
  if (spread >= 28 && dissentCount <= 1) return "Low";
  if (spread >= 14 || dissentCount <= 2) return "Medium";
  return "High";
}

export function buildCourtDeskSummary(input: {
  court: MeridianBullBearCourt | null | undefined;
  consensus: GateJudgeConsensus | null | undefined;
  verdictTier: DeskVerdictTier;
}): CourtDeskSummary {
  const bullScore = input.court?.bull.score ?? input.consensus?.weights.longPct ?? 0;
  const bearScore = input.court?.bear.score ?? input.consensus?.weights.bearPct ?? 0;
  const holdScore =
    input.consensus?.weights.holdPct ?? Math.max(0, 100 - bullScore - bearScore);
  const spread = input.court?.spread ?? Math.abs(bullScore - bearScore);
  const dissent = input.court?.dissent.length ?? 0;
  const conflict = conflictLevelFromSpread(spread, dissent);

  const note =
    conflict === "High"
      ? "Layers disagree — risk and structure dominate until alignment improves."
      : conflict === "Medium"
        ? "Partial disagreement — review before sizing."
        : "Evidence spread is directional — still subject to permit and risk veto.";

  return {
    bullScore: Math.round(bullScore),
    bearScore: Math.round(bearScore),
    holdScore: Math.round(holdScore),
    spread: Math.round(spread),
    conflict,
    verdict: input.verdictTier,
    note,
  };
}

export function buildFourPillars(input: {
  regime?: string | null;
  trendSignal?: string | null;
  rsSignal?: string | null;
  liquiditySignal?: string | null;
  fearGreed?: number | null;
}): FourPillar[] {
  const regimeRaw = (input.regime ?? "neutral").toLowerCase();
  const regimeValue =
    regimeRaw.includes("risk-off") || (input.fearGreed != null && input.fearGreed < 30)
      ? "Risk-off"
      : regimeRaw.includes("risk-on") || (input.fearGreed != null && input.fearGreed > 55)
        ? "Risk-on"
        : "Neutral";

  const trendValue = signalToTrend(input.trendSignal);
  const rsValue = signalToRelativeStrength(input.rsSignal);
  const liqValue = signalToLiquidity(input.liquiditySignal);

  return [
    {
      id: "regime",
      label: "Market regime",
      value: regimeValue,
      detail: input.fearGreed != null ? `Sentiment ${Math.round(input.fearGreed)} · dominates sizing` : "Macro tape context",
    },
    {
      id: "trend",
      label: "Trend",
      value: trendValue,
      detail: "Price structure across live windows",
    },
    {
      id: "relativeStrength",
      label: "Relative strength",
      value: rsValue,
      detail: "Performance vs BNB benchmark",
    },
    {
      id: "liquidity",
      label: "Liquidity",
      value: liqValue,
      detail: "Execution quality and depth",
    },
  ];
}

function signalToTrend(signal?: string | null): string {
  const s = (signal ?? "").toUpperCase();
  if (s === "ENTER_LONG" || s === "LONG") return "Bullish";
  if (s === "EXIT" || s === "AVOID" || s === "SHORT") return "Bearish";
  return "Neutral";
}

function signalToRelativeStrength(signal?: string | null): string {
  const s = (signal ?? "").toUpperCase();
  if (s === "ENTER_LONG" || s === "LONG") return "Leader";
  if (s === "EXIT" || s === "AVOID") return "Lagging";
  return "Average";
}

function signalToLiquidity(signal?: string | null): string {
  const s = (signal ?? "").toUpperCase();
  if (s === "ENTER_LONG" || s === "LONG") return "Healthy";
  if (s === "AVOID") return "Thin";
  if (s === "EXIT") return "Weak";
  return "Average";
}

export function spotStateTone(state: SpotDeskState): string {
  switch (state) {
    case "ACCUMULATE":
      return "text-emerald-300";
    case "HOLD POSITION":
      return "text-cyan-200";
    case "WAIT":
      return "text-white/70";
    case "REDUCE":
      return "text-amber-200";
    case "EXIT":
      return "text-rose-300";
  }
}

export function verdictTierTone(tier: DeskVerdictTier): string {
  if (tier === "Strong Long" || tier === "Tactical Long") return "text-emerald-300";
  if (tier === "Strong Short" || tier === "Tactical Short") return "text-rose-300";
  return "text-white/75";
}

/** Router capital rank with no primary symbol */
export function routerDeskState(primary: string | null | undefined): SpotDeskState {
  const p = (primary ?? "").trim().toUpperCase();
  if (!p || p === "FLAT" || p === "—" || p === "WAIT") return "WAIT";
  return "ACCUMULATE";
}
