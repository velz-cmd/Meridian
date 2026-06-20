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
  dominantVote: DeskTraderStance | "—";
  liveVoteSummary: string;
  liveCount: number;
  plannedCount: number;
  note: string;
  /** Primary live bar driving the vote, e.g. "3d +5.99%" */
  anchorBar: string | null;
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

/** Pick dominant vote — live CMC bars first, then all bucket votes */
function resolveDominantVote(bucketVotes: { direction: string; source: string }[]): DeskTraderStance | "—" {
  const live = bucketVotes.filter((v) => v.source === "live-cmc" && v.direction !== "NEUTRAL");
  if (live.length) {
    const label = dominantVote(live);
    return label === "—" ? "HOLD" : (label as DeskTraderStance);
  }
  const all = bucketVotes.filter((v) => v.direction !== "NEUTRAL");
  if (all.length) {
    const label = dominantVote(all);
    return label === "—" ? "HOLD" : (label as DeskTraderStance);
  }
  return "—";
}

/** Timeframe context for Overview — drives hero signal for selected horizon */
export function resolveHorizonContext(
  evidence: MeridianDirectionEvidence | null | undefined,
  horizonId: GateHorizonId,
  market?: { change1h?: number; change24h?: number; change7d?: number },
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
      anchorBar: null,
      dataQuality: null,
    };
  }

  const bucketVotes = evidence.timeframeVotes.filter((v) => opt.buckets.includes(v.bucket));
  const liveVotes = bucketVotes.filter((v) => v.source === "live-cmc" && v.direction !== "NEUTRAL");
  const plannedVotes = bucketVotes.filter((v) => v.source === "planned" || v.direction === "NEUTRAL");
  const dominant = resolveDominantVote(bucketVotes);

  const liveSummary =
    liveVotes.length > 0
      ? liveVotes.map((v) => `${v.timeframe} ${voteToLabel(v.direction)}`).join(" · ")
      : plannedVotes.length > 0
        ? "Awaiting live CMC micro bars — refresh intelligence feed"
        : "No votes in this horizon bucket";

  const anchorVote = liveVotes.find((v) => voteToLabel(v.direction) === dominant) ?? liveVotes[0];
  let anchorBar: string | null = null;
  if (anchorVote) {
    const ch =
      anchorVote.timeframe === "1h"
        ? market?.change1h
        : anchorVote.timeframe === "1d"
          ? market?.change24h
          : anchorVote.timeframe === "3d"
            ? market?.change7d
            : undefined;
    anchorBar = ch != null ? `${anchorVote.timeframe} ${formatChangePct(ch)}` : anchorVote.timeframe;
  }

  const note =
    liveVotes.length === 0
      ? "Live CMC % change drives each horizon — select a horizon to see its read."
      : dominant === "HOLD"
        ? "Price change within threshold for this horizon — HOLD is the honest read."
        : `Live CMC ${dominant} bias on ${opt.label.toLowerCase()} horizon.`;

  return {
    horizonLabel: opt.label,
    dominantVote: dominant,
    liveVoteSummary: liveSummary,
    liveCount: liveVotes.length,
    plannedCount: plannedVotes.length,
    note,
    anchorBar,
    dataQuality: evidence.dataQualityScore,
  };
}

export function horizonDeskLabel(horizonLabel: string, stance: DeskTraderStance | "—"): string {
  if (stance === "—") return "DESK · SYNCING";
  if (stance === "LONG") return `${horizonLabel.toUpperCase()} · LONG BIAS`;
  if (stance === "EXIT") return `${horizonLabel.toUpperCase()} · EXIT BIAS`;
  return `${horizonLabel.toUpperCase()} · HOLD`;
}

export function buildHorizonSummary(input: {
  ctx: GateHorizonContext;
  executionStance: DeskTraderStance;
  permit: "GRANT" | "DENY" | "WAIT";
  checksPassed: number | null;
  checksTotal: number | null;
}): string {
  const { ctx, executionStance, permit, checksPassed, checksTotal } = input;
  if (ctx.dominantVote === "—") {
    return "Awaiting live CMC timeframe evidence — refresh or pick another symbol.";
  }
  const checks =
    checksPassed != null && checksTotal != null ? `${checksPassed}/${checksTotal} constitution checks` : "constitution pending";
  const anchor = ctx.anchorBar ? ` · anchor ${ctx.anchorBar}` : "";
  const bars = ctx.liveVoteSummary !== "DATA UNAVAILABLE" ? ctx.liveVoteSummary : "";
  return (
    `${ctx.horizonLabel} horizon: ${ctx.dominantVote} from live CMC${anchor}` +
    (bars ? ` (${bars})` : "") +
    `. Execution router ${executionStance} · permit ${permit} · ${checks}.`
  );
}
