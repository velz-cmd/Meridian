"use client";

import { useState } from "react";
import type { MeridianDirectionEvidence } from "@/lib/meridian-direction-engine";
import {
  GATE_HORIZON_OPTIONS,
  resolveHorizonContext,
  type GateHorizonId,
} from "@/lib/gate-desk-labels";
import { spotStateTone } from "@/lib/meridian-desk-states";
import { cn } from "@/lib/utils";

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

/** All-window strip — every real CMC window at a glance (horizons may disagree) */
export function GateHorizonAllWindows({
  evidence,
  market,
  active,
  onSelect,
  loading,
}: {
  evidence: MeridianDirectionEvidence | null | undefined;
  market?: { change1h?: number; change24h?: number; change7d?: number; change30d?: number };
  active: GateHorizonId;
  onSelect: (id: GateHorizonId) => void;
  loading?: boolean;
}) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/[0.08] pt-5 sm:grid-cols-4">
      {GATE_HORIZON_OPTIONS.map((opt) => {
        const ctx = resolveHorizonContext(evidence, opt.id, market);
        const isActive = opt.id === active;
        const state = ctx.dominantVote;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={cn(
              "rounded-xl border px-3 py-3 text-left transition",
              isActive
                ? "border-cyan-400/40 bg-cyan-500/[0.07]"
                : "border-white/[0.08] bg-black/30 hover:border-white/15",
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">{opt.label}</span>
              <span className="text-[9px] text-white/35">{opt.timeframe}</span>
            </div>
            <p
              className={cn(
                "mt-1 text-sm font-bold leading-tight",
                state === "—" ? "text-white/45" : spotStateTone(state),
              )}
            >
              {loading ? "…" : state}
            </p>
            <p
              className={cn(
                "mt-0.5 text-[11px] tabular-nums",
                ctx.changeValue == null
                  ? "text-white/35"
                  : ctx.changeValue >= 0
                    ? "text-emerald-300/80"
                    : "text-rose-300/80",
              )}
            >
              {ctx.changeLabel}
            </p>
          </button>
        );
      })}
    </div>
  );
}

/** Standalone horizon section (Technical tab) */
export function GateHorizonContext({
  evidence,
  loading,
  horizon,
  onHorizonChange,
  defaultHorizon = "daily",
  market,
}: {
  evidence: MeridianDirectionEvidence | null | undefined;
  loading?: boolean;
  horizon?: GateHorizonId;
  onHorizonChange?: (id: GateHorizonId) => void;
  defaultHorizon?: GateHorizonId;
  market?: { change1h?: number; change24h?: number; change7d?: number; change30d?: number };
}) {
  const [internal, setInternal] = useState<GateHorizonId>(defaultHorizon);
  const active = horizon ?? internal;
  const setHorizon = onHorizonChange ?? setInternal;

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-4 sm:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
        Desk state · real CMC windows
      </p>
      <p className="mt-1 text-sm text-white/70">
        Scalp · day trade · swing · position may disagree — that is normal multi-scale behavior.
      </p>
      <GateHorizonAllWindows
        evidence={evidence}
        market={market}
        active={active}
        onSelect={setHorizon}
        loading={loading}
      />
    </section>
  );
}
