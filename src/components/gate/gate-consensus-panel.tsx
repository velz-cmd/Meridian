"use client";

import { Scale } from "lucide-react";
import type { GateJudgeConsensus } from "@/lib/gate-consensus-payload";
import { cn } from "@/lib/utils";

function signalTone(signal: string) {
  if (signal === "ENTER_LONG") return "text-emerald-300 border-emerald-400/35 bg-emerald-500/10";
  if (signal === "EXIT" || signal === "AVOID") return "text-rose-300 border-rose-400/35 bg-rose-500/10";
  return "text-white/70 border-white/10 bg-black/30";
}

/** Live weighted consensus — same block as GET /api/gate/skills → consensus */
export function GateConsensusPanel({ consensus }: { consensus: GateJudgeConsensus | null }) {
  if (!consensus) return null;

  const { weights, votes, permit, coreStack } = consensus;

  return (
    <section className="gate-consensus-panel rounded-2xl border border-amber-400/20 bg-amber-950/15 overflow-hidden">
      <div className="border-b border-white/8 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Scale className="mt-0.5 h-4 w-4 text-amber-300/90" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/85">
                Skill consensus · {consensus.schema}
              </p>
              <h3 className="mt-1 text-base font-semibold text-white">
                Desk {consensus.deskPosition} · {consensus.deskSignal.replace(/_/g, " ")}
                {consensus.constitutionOnly && (
                  <span className="ml-2 text-sm font-normal text-amber-200/90">(constitution split)</span>
                )}
              </h3>
              <p className="mt-1 text-xs text-white/55">{consensus.method}</p>
            </div>
          </div>
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase",
              permit.status === "GRANT"
                ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
                : "border-rose-400/30 bg-rose-500/10 text-rose-200",
            )}
          >
            Permit {permit.status}
          </span>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
        <div className="rounded-xl border border-white/10 bg-black/35 p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Weight split</p>
          <div className="mt-2 space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-emerald-300">Long</span>
              <span>{weights.longPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Hold</span>
              <span>{weights.holdPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-rose-300">Bear</span>
              <span>{weights.bearPct}%</span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-white/40">
            Need ≥{(consensus.rules as { longWeightMinPct?: number }).longWeightMinPct ?? 55}% long · bear cap{" "}
            {(consensus.rules as { bearWeightMaxPct?: number }).bearWeightMaxPct ?? 15}%
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/35 p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Layer votes</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-white">
            {votes.long}
            <span className="text-sm font-normal text-white/40"> / {votes.total} long</span>
          </p>
          <p className="mt-1 text-[11px] text-white/55">
            {votes.hold} hold · {votes.bear} bear · alignment {consensus.alignmentScore}/100
          </p>
          <p className="mt-2 text-[10px] text-white/40">
            Core stack {coreStack.long}/{coreStack.required}{" "}
            {coreStack.passed ? "✓" : "✕"} (momentum · regime · trend · RS)
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/35 p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Permit audit</p>
          <p className="mt-2 text-sm leading-snug text-white/80">{permit.reason}</p>
          <p className="mt-2 font-mono text-[10px] text-white/40">
            Constitution {consensus.constitutionSignal.replace(/_/g, " ")} · {consensus.constitutionChecks} ·{" "}
            {consensus.constitutionTier}
          </p>
          {consensus.blockers.length > 0 && (
            <p className="mt-2 text-[10px] text-amber-200/90">Blockers: {consensus.blockers.join(", ")}</p>
          )}
        </div>
      </div>

      <div className="border-t border-white/8 px-4 py-3 sm:px-5">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">Nine-layer vote</p>
        <div className="flex flex-wrap gap-1.5">
          {consensus.layers.map((layer) => (
            <span
              key={layer.id}
              className={cn(
                "rounded-md border px-2 py-1 text-[10px] font-medium",
                signalTone(layer.signal),
                layer.agreesWithDesk === false && "opacity-55 ring-1 ring-amber-400/30",
              )}
              title={`weight ${layer.weight}`}
            >
              {layer.name}: {layer.signal.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
