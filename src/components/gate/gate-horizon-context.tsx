"use client";

import { useState } from "react";
import type { MeridianDirectionEvidence } from "@/lib/meridian-direction-engine";
import {
  GATE_HORIZON_OPTIONS,
  resolveHorizonContext,
  type GateHorizonId,
} from "@/lib/gate-desk-labels";
import { cn } from "@/lib/utils";

function voteTone(vote: string) {
  if (vote === "LONG") return "text-emerald-300";
  if (vote === "EXIT") return "text-rose-300";
  if (vote === "HOLD") return "text-white/80";
  return "text-white/45";
}

/** Overview horizon picker — filters timeframe evidence; router verdict unchanged */
export function GateHorizonContext({
  evidence,
  loading,
  defaultHorizon = "swing",
}: {
  evidence: MeridianDirectionEvidence | null | undefined;
  loading?: boolean;
  defaultHorizon?: GateHorizonId;
}) {
  const [horizon, setHorizon] = useState<GateHorizonId>(defaultHorizon);
  const ctx = resolveHorizonContext(evidence, horizon);

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Horizon context · evidence only
          </p>
          <p className="mt-1 text-sm text-white/70">
            Router ONE TRUTH above — this grid shows timing for the horizon you trade.
          </p>
        </div>
        {evidence ? (
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
            Data quality {evidence.dataQualityScore}%
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {GATE_HORIZON_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setHorizon(opt.id)}
            className={cn(
              "rounded-xl border px-3 py-2 text-left transition",
              horizon === opt.id
                ? "border-cyan-400/35 bg-cyan-500/10 text-white"
                : "border-white/[0.08] bg-black/20 text-white/55 hover:border-white/15",
            )}
          >
            <span className="text-xs font-semibold">{opt.label}</span>
            <span className="ml-1.5 text-[10px] text-white/40">{opt.sub}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Horizon vote</p>
          <p className={cn("mt-1 text-xl font-bold tabular-nums", voteTone(ctx.dominantVote))}>
            {loading ? "…" : ctx.dominantVote}
          </p>
          <p className="mt-0.5 text-[10px] text-white/45">{ctx.horizonLabel} bucket</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 sm:col-span-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Live bars</p>
          <p className="mt-1 text-xs leading-relaxed text-white/70">
            {loading ? "Syncing timeframe evidence…" : ctx.liveVoteSummary}
          </p>
          <p className="mt-1 text-[10px] text-white/40">
            {ctx.liveCount} live · {ctx.plannedCount} planned · {ctx.note}
          </p>
        </div>
      </div>
    </section>
  );
}
