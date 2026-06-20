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

export function GateHorizonPicker({
  horizon,
  onHorizonChange,
  className,
}: {
  horizon: GateHorizonId;
  onHorizonChange: (id: GateHorizonId) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {GATE_HORIZON_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onHorizonChange(opt.id)}
          className={cn(
            "rounded-xl border px-3 py-2.5 text-left transition sm:px-4",
            horizon === opt.id
              ? "border-cyan-400/40 bg-cyan-500/12 text-white shadow-[0_0_24px_-8px_rgba(34,211,238,0.35)]"
              : "border-white/[0.08] bg-black/25 text-white/55 hover:border-white/15",
          )}
        >
          <span className="text-sm font-semibold">{opt.label}</span>
          <span className="ml-2 text-[10px] text-white/40">{opt.sub}</span>
        </button>
      ))}
    </div>
  );
}

/** Horizon detail grid — pairs with GateHorizonPicker in Overview hero */
export function GateHorizonDetail({
  evidence,
  horizon,
  loading,
  market,
}: {
  evidence: MeridianDirectionEvidence | null | undefined;
  horizon: GateHorizonId;
  loading?: boolean;
  market?: { change1h?: number; change24h?: number; change7d?: number };
}) {
  const ctx = resolveHorizonContext(evidence, horizon, market);

  return (
    <div className="mt-5 grid gap-3 border-t border-white/[0.08] pt-5 sm:grid-cols-3">
      <div className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-3">
        <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Horizon signal</p>
        <p className={cn("mt-1 text-3xl font-bold tabular-nums", voteTone(ctx.dominantVote))}>
          {loading ? "…" : ctx.dominantVote}
        </p>
        <p className="mt-1 text-[10px] text-white/45">{ctx.horizonLabel} · live CMC</p>
      </div>
      <div className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-3 sm:col-span-2">
        <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Live bars · {ctx.horizonLabel}</p>
        <p className="mt-1 text-sm leading-relaxed text-white/75">
          {loading ? "Syncing CMC timeframe evidence…" : ctx.liveVoteSummary}
        </p>
        <p className="mt-2 text-[10px] text-white/45">
          {ctx.liveCount} live · {ctx.anchorBar ? `anchor ${ctx.anchorBar} · ` : ""}
          {ctx.note}
          {ctx.dataQuality != null ? ` · data quality ${ctx.dataQuality}%` : ""}
        </p>
      </div>
    </div>
  );
}

/** Standalone horizon section */
export function GateHorizonContext({
  evidence,
  loading,
  horizon,
  onHorizonChange,
  defaultHorizon = "swing",
  market,
}: {
  evidence: MeridianDirectionEvidence | null | undefined;
  loading?: boolean;
  horizon?: GateHorizonId;
  onHorizonChange?: (id: GateHorizonId) => void;
  defaultHorizon?: GateHorizonId;
  market?: { change1h?: number; change24h?: number; change7d?: number };
}) {
  const [internal, setInternal] = useState<GateHorizonId>(defaultHorizon);
  const active = horizon ?? internal;
  const setHorizon = onHorizonChange ?? setInternal;

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-4 sm:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
        Horizon · live CMC timeframes
      </p>
      <p className="mt-1 text-sm text-white/70">Pick the horizon you trade — signal updates from live CMC % moves.</p>
      <GateHorizonPicker horizon={active} onHorizonChange={setHorizon} className="mt-4" />
      <GateHorizonDetail evidence={evidence} horizon={active} loading={loading} market={market} />
    </section>
  );
}
