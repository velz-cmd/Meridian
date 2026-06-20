/**
 * Trader-facing labels for Gate desk — internal engine keeps LONG / SHORT / FLAT.
 * Display: LONG · HOLD · EXIT (spot exit bias, not perp short).
 */
import type { MeridianDirectionEvidence, MeridianTimeHorizonBucket } from "@/lib/meridian-direction-engine";
import type { PositionDirection } from "@/lib/position-router";

export type GateHorizonId = "scalping" | "intraday" | "swing" | "position";

export const GATE_HORIZON_OPTIONS: {
  id: GateHorizonId;
  label: string;
  sub: string;
  buckets: MeridianTimeHorizonBucket[];
}[] = [
  { id: "scalping", label: "Scalp", sub: "3m–15m", buckets: ["scalping", "short-term"] },
  { id: "intraday", label: "Intraday", sub: "1h–4h", buckets: ["intraday"] },
  { id: "swing", label: "Swing", sub: "1d–3d", buckets: ["swing"] },
  { id: "position", label: "Position", sub: "1w", buckets: ["position"] },
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

function dominantVote(votes: { direction: string }[]): string {
  const counts = { LONG: 0, EXIT: 0, HOLD: 0 };
  for (const v of votes) {
    const label = voteToLabel(v.direction);
    if (label === "LONG") counts.LONG += 1;
    else if (label === "EXIT") counts.EXIT += 1;
    else if (label === "HOLD") counts.HOLD += 1;
  }
  const max = Math.max(counts.LONG, counts.EXIT, counts.HOLD);
  if (max === 0) return "—";
  if (counts.LONG === max && counts.LONG >= counts.EXIT && counts.LONG >= counts.HOLD) return "LONG";
  if (counts.EXIT === max && counts.EXIT >= counts.HOLD) return "EXIT";
  return "HOLD";
}

export type GateHorizonContext = {
  horizonLabel: string;
  dominantVote: string;
  liveVoteSummary: string;
  liveCount: number;
  plannedCount: number;
  note: string;
};

/** Timeframe context for Overview — evidence only; router ONE TRUTH unchanged */
export function resolveHorizonContext(
  evidence: MeridianDirectionEvidence | null | undefined,
  horizonId: GateHorizonId,
): GateHorizonContext {
  const opt = GATE_HORIZON_OPTIONS.find((o) => o.id === horizonId)!;
  if (!evidence) {
    return {
      horizonLabel: opt.label,
      dominantVote: "—",
      liveVoteSummary: "DATA UNAVAILABLE",
      liveCount: 0,
      plannedCount: 0,
      note: "Sync intelligence API for multi-timeframe votes.",
    };
  }

  const bucketVotes = evidence.timeframeVotes.filter((v) => opt.buckets.includes(v.bucket));
  const liveVotes = bucketVotes.filter((v) => v.source === "live-cmc" && v.direction !== "NEUTRAL");
  const plannedVotes = bucketVotes.filter((v) => v.source === "planned" || v.direction === "NEUTRAL");
  const dominant = dominantVote(bucketVotes.length ? bucketVotes : evidence.timeframeVotes);

  const liveSummary =
    liveVotes.length > 0
      ? liveVotes.map((v) => `${v.timeframe} ${voteToLabel(v.direction)}`).join(" · ")
      : plannedVotes.length > 0
        ? "Planned layers only — micro bars not on live CMC feed"
        : "No votes in this horizon bucket";

  const note =
    evidence.timeHorizonBucket === "mixed" && horizonId !== "swing"
      ? "Mixed horizons — swing/position anchor unless consensus clears."
      : liveVotes.length === 0
        ? "Horizon context from planned skill layers until live bars arrive."
        : "Live CMC votes for selected horizon — router verdict stays ONE TRUTH above.";

  return {
    horizonLabel: opt.label,
    dominantVote: dominant,
    liveVoteSummary: liveSummary,
    liveCount: liveVotes.length,
    plannedCount: plannedVotes.length,
    note,
  };
}
