"use client";

import { ChevronDown } from "lucide-react";
import type { GateSkillLayerView } from "@/lib/gate-skill-layers";
import { cn } from "@/lib/utils";

const TONE: Record<GateSkillLayerView["stanceTone"], string> = {
  long: "text-emerald-300/95 bg-emerald-500/10 border-emerald-400/25",
  flat: "text-white/75 bg-white/[0.04] border-white/10",
  avoid: "text-rose-300/95 bg-rose-500/10 border-rose-400/25",
};

export function GateSkillLayerCard({ layer }: { layer: GateSkillLayerView }) {
  const scoreLabel = layer.score != null ? String(layer.score) : "—";

  return (
    <details className="gate-skill-layer-card group rounded-xl border border-white/[0.08] bg-black/25 transition-colors open:bg-black/35">
      <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-white">{layer.title}</h4>
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  TONE[layer.stanceTone],
                )}
              >
                {layer.stance}
              </span>
              {layer.flagged && (
                <span className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                  Flagged
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-snug text-white/80">{layer.reason}</p>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <div className="text-right">
              <p className="text-[10px] text-white/40">Score</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-white">{scoreLabel}</p>
            </div>
            <ChevronDown className="mt-2 h-4 w-4 text-white/35 transition group-open:rotate-180" />
          </div>
        </div>
      </summary>
      <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/55">Full metrics · live CMC</p>
        <ul className="space-y-1.5">
          {layer.metrics.map((m) => (
            <li key={m} className="flex gap-2 text-[12px] text-white/72">
              <span className="text-white/25">·</span>
              <span>{m}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 font-mono text-[10px] text-white/35">
          Signal {layer.signal.replace(/_/g, " ")} · evidence only, not BUY/SELL
        </p>
      </div>
    </details>
  );
}
