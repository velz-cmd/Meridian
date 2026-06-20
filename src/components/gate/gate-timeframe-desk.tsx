"use client";

import type { MeridianDirectionEvidence } from "@/lib/meridian-direction-engine";
import { MERIDIAN_DECISION_TIMEFRAMES } from "@/lib/meridian-direction-engine";
import { cn } from "@/lib/utils";

function directionLabel(d: string) {
  if (d === "LONG") return "Long";
  if (d === "SHORT") return "Short";
  if (d === "FLAT") return "Flat";
  return "Neutral";
}

function directionClass(d: string) {
  if (d === "LONG") return "border-emerald-400/35 bg-emerald-500/10 text-emerald-100";
  if (d === "SHORT") return "border-rose-400/35 bg-rose-500/10 text-rose-100";
  if (d === "FLAT") return "border-slate-400/25 bg-slate-500/10 text-slate-200";
  return "border-white/10 bg-black/25 text-white/50";
}

function sourceBadge(source: "live-cmc" | "planned") {
  if (source === "live-cmc") return "Live CMC";
  return "Planned";
}

/** Multi-timeframe desk — honest live vs planned votes from directionEvidence. */
export function GateTimeframeDesk({
  evidence,
  loading,
}: {
  evidence: MeridianDirectionEvidence | null | undefined;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-black/25 px-4 py-6 text-sm text-white/50">
        Loading timeframe evidence…
      </section>
    );
  }

  if (!evidence) {
    return (
      <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-6 text-sm text-amber-100">
        DATA UNAVAILABLE — sync intelligence API for multi-timeframe votes.
      </section>
    );
  }

  const votes = evidence.timeframeVotes;
  const liveVotes = votes.filter((v) => v.source === "live-cmc" && v.direction !== "NEUTRAL");
  const conflictNote =
    evidence.timeHorizonBucket === "mixed"
      ? "Mixed horizons — lower timeframes cannot override swing without consensus."
      : evidence.flatNote;

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-cyan-950/15 overflow-hidden">
      <div className="border-b border-white/8 px-4 py-4 sm:px-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/85">
          Timeframe desk · evidence only
        </p>
        <h3 className="mt-1 text-base font-semibold text-white">3m → 1w horizon map</h3>
        <p className="mt-1 text-xs text-white/55">
          Each cell is an independent vote from available data. Overview router remains ONE TRUTH; this
          grid explains timing context.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
            Long {evidence.longScore}
          </span>
          <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-rose-200">
            Short {evidence.shortScore}
          </span>
          <span className="rounded-full border border-slate-400/25 bg-slate-500/10 px-2 py-0.5 text-slate-200">
            Hold {evidence.holdScore}
          </span>
          <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-amber-100">
            Conflict {evidence.conflictScore}
          </span>
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-white/55">
            Data quality {evidence.dataQualityScore}%
          </span>
        </div>
        {conflictNote ? <p className="mt-2 text-xs text-amber-100/90">{conflictNote}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-5 sm:p-5">
        {MERIDIAN_DECISION_TIMEFRAMES.map(({ tf, bucket }) => {
          const vote = votes.find((v) => v.timeframe === tf);
          const dir = vote?.direction ?? "NEUTRAL";
          const source = vote?.source ?? "planned";
          const unavailable = source === "planned" && dir === "NEUTRAL";

          return (
            <div
              key={tf}
              className={cn(
                "rounded-xl border px-2.5 py-2.5",
                unavailable ? "border-white/[0.08] bg-black/30" : directionClass(dir),
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-sm font-bold text-white">{tf}</span>
                <span className="text-[9px] uppercase text-white/45">{bucket}</span>
              </div>
              <p className="mt-1 text-xs font-semibold">
                {unavailable && source === "planned" ? "Planned" : directionLabel(dir)}
              </p>
              <p className="mt-1 text-[9px] text-white/45">
                {source === "live-cmc" ? sourceBadge(source) : unavailable ? "DATA UNAVAILABLE" : sourceBadge(source)}
              </p>
            </div>
          );
        })}
      </div>

      {liveVotes.length > 0 && (
        <p className="border-t border-white/8 px-4 py-3 text-[10px] text-white/45 sm:px-5">
          Live votes: {liveVotes.map((v) => `${v.timeframe} ${v.direction}`).join(" · ")} · horizon{" "}
          {evidence.horizon}
        </p>
      )}
    </section>
  );
}
