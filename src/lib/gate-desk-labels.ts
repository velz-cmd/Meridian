/**
 * Trader-facing labels for Gate desk — internal engine keeps LONG / SHORT / FLAT.
 * Display uses professional spot desk states (ACCUMULATE · WAIT · REDUCE · EXIT).
 */
import type { MeridianDirectionEvidence } from "@/lib/meridian-direction-engine";
import type { PositionDirection } from "@/lib/position-router";
import {
  resolveHorizonSpotState,
  spotStateReason,
  type SpotDeskState,
} from "@/lib/meridian-desk-states";

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
  { id: "intraday", label: "Scalp", sub: "1h window", timeframe: "1h", changeKey: "change1h" },
  { id: "daily", label: "Day trade", sub: "24h window", timeframe: "24h", changeKey: "change24h" },
  { id: "swing", label: "Swing", sub: "7d window", timeframe: "7d", changeKey: "change7d" },
  { id: "position", label: "Position", sub: "30d window", timeframe: "30d", changeKey: "change30d" },
];

/** @deprecated use SpotDeskState — kept for internal router mapping */
export type DeskTraderStance = "LONG" | "HOLD" | "EXIT";

export function spotToLegacyStance(state: SpotDeskState): DeskTraderStance {
  if (state === "ACCUMULATE" || state === "HOLD POSITION") return "LONG";
  if (state === "EXIT" || state === "REDUCE") return "EXIT";
  return "HOLD";
}

export function legacyStanceToSpot(stance: DeskTraderStance): SpotDeskState {
  if (stance === "LONG") return "ACCUMULATE";
  if (stance === "EXIT") return "EXIT";
  return "WAIT";
}

/** Map internal router direction to spot desk state */
export function deskDirectionLabel(direction: PositionDirection): SpotDeskState {
  if (direction === "LONG") return "ACCUMULATE";
  if (direction === "SHORT") return "REDUCE";
  return "WAIT";
}

/** Map constitution or composite gate signal to spot desk state */
export function deskSignalLabel(signal: string | undefined | null): SpotDeskState {
  const s = (signal ?? "WAIT").toUpperCase().replace(/ /g, "_");
  if (s === "ENTER_LONG" || s === "LONG") return "ACCUMULATE";
  if (s === "EXIT" || s === "AVOID") return "EXIT";
  if (s === "REDUCE") return "REDUCE";
  if (s === "HOLD_POSITION" || s === "HOLD POSITION") return "HOLD POSITION";
  return "WAIT";
}

/** Exposure line under symbol (settlement context) */
export function deskExposureLabel(direction: PositionDirection): string {
  if (direction === "LONG") return "Long · spot exposure";
  if (direction === "SHORT") return "Reduce · rotate to cash";
  return "Flat · no position";
}

/** Capital router primary — FLAT reads as WAIT (no edge) */
export function deskRouterPickValue(primary: string | undefined | null): SpotDeskState | string {
  const p = (primary ?? "").trim().toUpperCase();
  if (!p || p === "FLAT" || p === "—" || p === "WAIT") return "WAIT";
  return primary!.trim();
}

export type HorizonMarket = {
  change1h?: number;
  change24h?: number;
  change7d?: number;
  change30d?: number;
};

export type GateHorizonContext = {
  horizonLabel: string;
  windowLabel: string;
  /** Actionable spot desk state for this window */
  dominantVote: SpotDeskState | "—";
  changeLabel: string;
  changeValue: number | null;
  liveVoteSummary: string;
  hasLiveData: boolean;
  note: string;
  dataQuality: number | null;
};

export function traderStanceToDirection(state: SpotDeskState | DeskTraderStance): PositionDirection {
  const spot: SpotDeskState =
    state === "LONG" || state === "HOLD" || state === "EXIT"
      ? legacyStanceToSpot(state as DeskTraderStance)
      : state;
  if (spot === "ACCUMULATE" || spot === "HOLD POSITION") return "LONG";
  if (spot === "EXIT" || spot === "REDUCE") return "SHORT";
  return "FLAT";
}

function formatChangePct(ch: number): string {
  return `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`;
}

/**
 * Actionable spot state for ONE real CMC window. Horizons may disagree — that is normal.
 */
export function resolveHorizonContext(
  evidence: MeridianDirectionEvidence | null | undefined,
  horizonId: GateHorizonId,
  market?: HorizonMarket,
  hasOpenPosition = false,
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

  const dominant: SpotDeskState | "—" = hasChange
    ? resolveHorizonSpotState(change!, horizonId, hasOpenPosition)
    : "—";

  const changeLabel = hasChange ? formatChangePct(change!) : "DATA UNAVAILABLE";
  const liveVoteSummary = hasChange ? `${opt.label} · ${changeLabel} → ${dominant}` : "DATA UNAVAILABLE";

  const note =
    dominant === "—"
      ? "No live CMC value for this window yet."
      : spotStateReason(dominant, changeLabel, opt.label);

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

export function horizonDeskLabel(horizonLabel: string): string {
  return `${horizonLabel.toUpperCase()} · DESK STATE`;
}

/** Single coherent sentence — desk state (price) and permit (rules) as two clear axes. */
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

  const stateLine = `${symbol} · ${ctx.horizonLabel} ${ctx.changeLabel} → ${ctx.dominantVote}`;

  const permitLine =
    permit === "GRANT"
      ? `Permit GRANT · ${checks} — entry cleared.`
      : permit === "WAIT"
        ? `Permit WAIT · ${checks} — no edge for new size yet.`
        : `Permit DENY · ${checks} — rules block entry; desk state is price context only.`;

  return `${stateLine} (live CMC). ${permitLine}`;
}
