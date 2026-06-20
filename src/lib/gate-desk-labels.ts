/**
 * Trader-facing labels for Gate desk — internal engine keeps LONG / SHORT / FLAT.
 * Display: LONG · HOLD · EXIT (spot exit bias, not perp short).
 */
import type { MeridianDirectionEvidence } from "@/lib/meridian-direction-engine";
import type { PositionDirection } from "@/lib/position-router";

export type GateHorizonId = "intraday" | "daily" | "swing" | "position";

type HorizonChangeKey = "change1h" | "change24h" | "change7d" | "change30d";

export const GATE_HORIZON_OPTIONS: {
  id: GateHorizonId;
  label: string;
  sub: string;
  /** Real CMC percent-change window backing this horizon */
  timeframe: string;
  changeKey: HorizonChangeKey;
}[] = [
  { id: "intraday", label: "Intraday", sub: "1h", timeframe: "1h", changeKey: "change1h" },
  { id: "daily", label: "Daily", sub: "24h", timeframe: "24h", changeKey: "change24h" },
  { id: "swing", label: "Swing", sub: "7d", timeframe: "7d", changeKey: "change7d" },
  { id: "position", label: "Position", sub: "30d", timeframe: "30d", changeKey: "change30d" },
];

export type DeskTraderStance = "LONG" | "HOLD" | "EXIT";

/** Map internal router direction to trader-facing label */
export function deskDirectionLabel(direction: PositionDirection): DeskTraderStance {
  if (direction === "LONG") return "LONG";
  if (direction === "SHORT") return "EXIT";
  return "HOLD";
}

/** Map constitution or composite gate signal to trader label */
export function deskSignalLabel(signal: string | undefined | null): DeskTraderStance {
  const s = (signal ?? "HOLD").toUpperCase().replace(/ /g, "_");
  if (s === "ENTER_LONG" || s === "LONG") return "LONG";
  if (s === "EXIT" || s === "AVOID" || s === "SHORT") return "EXIT";
  return "HOLD";
}

/** Exposure line under symbol (settlement context) */
export function deskExposureLabel(direction: PositionDirection): string {
  if (direction === "LONG") return "Long · spot exposure";
  if (direction === "SHORT") return "Exit · reduce spot";
  return "Hold · no position";
}

/** Capital router primary — FLAT reads as HOLD for traders */
export function deskRouterPickValue(primary: string | undefined | null): string {
  const p = (primary ?? "").trim().toUpperCase();
  if (!p || p === "FLAT" || p === "—") return "HOLD";
  return primary!.trim();
}

function voteToLabel(dir: string): string {
  if (dir === "LONG") return "LONG";
  if (dir === "SHORT" || dir === "EXIT") return "EXIT";
  if (dir === "FLAT" || dir === "HOLD" || dir === "WAIT") return "HOLD";
  return "—";
}

export type HorizonMarket = {
  change1h?: number;
  change24h?: number;
  change7d?: number;
  change30d?: number;
};

export type GateHorizonContext = {
  horizonLabel: string;
  /** Real CMC window backing this horizon, e.g. "24h" */
  windowLabel: string;
  /** Trend read for the window — LONG / HOLD / EXIT (stable, one real number) */
  dominantVote: DeskTraderStance | "—";
  /** Signed % move for the window, e.g. "+2.31%" */
  changeLabel: string;
  changeValue: number | null;
  liveVoteSummary: string;
  hasLiveData: boolean;
  note: string;
  dataQuality: number | null;
};

export function traderStanceToDirection(stance: DeskTraderStance): PositionDirection {
  if (stance === "LONG") return "LONG";
  if (stance === "EXIT") return "SHORT";
  return "FLAT";
}

function formatChangePct(ch: number): string {
  return `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`;
}

/**
 * Trend read for ONE real CMC window. Stable across refreshes — a single live
 * number with a meaningful neutral band, never a fabricated vote blend.
 */
export function resolveHorizonContext(
  evidence: MeridianDirectionEvidence | null | undefined,
  horizonId: GateHorizonId,
  market?: HorizonMarket,
): GateHorizonContext {
  const opt = GATE_HORIZON_OPTIONS.find((o) => o.id === horizonId)!;
  const change = market?.[opt.changeKey];
  const hasChange = change != null && !Number.isNaN(change);

  if (!evidence && !hasChange) {
    return {
      horizonLabel: opt.label,
      windowLabel: opt.timeframe,
      dominantVote: "—",
      changeLabel: "DATA UNAVAILABLE",
      changeValue: null,
      liveVoteSummary: "DATA UNAVAILABLE",
      hasLiveData: false,
      note: "Live CMC feed syncing for this window.",
      dataQuality: null,
    };
  }

  const vote = evidence?.timeframeVotes.find((v) => v.timeframe === opt.timeframe);
  let dominant: DeskTraderStance | "—";
  if (vote && vote.direction !== "NEUTRAL") {
    dominant = voteToLabel(vote.direction) as DeskTraderStance;
  } else if (hasChange) {
    dominant = "HOLD";
  } else {
    dominant = "—";
  }

  const changeLabel = hasChange ? formatChangePct(change!) : "DATA UNAVAILABLE";
  const liveVoteSummary = hasChange ? `${opt.timeframe} ${changeLabel} → ${dominant}` : "DATA UNAVAILABLE";

  const note =
    !hasChange
      ? "No live CMC value for this window yet."
      : dominant === "LONG"
        ? `${opt.label} window up ${changeLabel} on live CMC.`
        : dominant === "EXIT"
          ? `${opt.label} window down ${changeLabel} on live CMC.`
          : `${opt.label} window flat (${changeLabel}) — inside the trend band.`;

  return {
    horizonLabel: opt.label,
    windowLabel: opt.timeframe,
    dominantVote: dominant,
    changeLabel,
    changeValue: hasChange ? change! : null,
    liveVoteSummary,
    hasLiveData: hasChange,
    note,
    dataQuality: evidence?.dataQualityScore ?? null,
  };
}

export function horizonDeskLabel(windowLabel: string): string {
  return `${windowLabel.toUpperCase()} TREND`;
}

/** Single coherent sentence — trend (price) and permit (rules) as two clear axes. */
export function buildHorizonSummary(input: {
  ctx: GateHorizonContext;
  symbol: string;
  permit: "GRANT" | "DENY" | "WAIT";
  checksPassed: number | null;
  checksTotal: number | null;
}): string {
  const { ctx, symbol, permit, checksPassed, checksTotal } = input;
  if (ctx.dominantVote === "—") {
    return "Live CMC timeframe data is syncing — pick another window or refresh.";
  }
  const checks =
    checksPassed != null && checksTotal != null ? `${checksPassed}/${checksTotal} constitution checks` : "constitution pending";

  const trend =
    ctx.dominantVote === "LONG"
      ? `${symbol} ${ctx.windowLabel} ${ctx.changeLabel} → trend LONG`
      : ctx.dominantVote === "EXIT"
        ? `${symbol} ${ctx.windowLabel} ${ctx.changeLabel} → trend EXIT`
        : `${symbol} ${ctx.windowLabel} ${ctx.changeLabel} → trend HOLD`;

  const permitLine =
    permit === "GRANT"
      ? `Strategy permit GRANT · ${checks} — entry cleared.`
      : permit === "WAIT"
        ? `Strategy permit WAIT · ${checks} — abstain until evidence clears.`
        : `Strategy permit DENY · ${checks} — rules not cleared, this is price trend, not a buy order.`;

  return `${trend} (live CMC). ${permitLine}`;
}
