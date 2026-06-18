"use client";

import { cn } from "@/lib/utils";

type GateCheck = {
  id: string;
  pass: boolean;
  weight: number;
  label: string;
};

export function GateCheckRadar({
  checks,
  confidence,
  edge,
}: {
  checks: GateCheck[];
  confidence?: number;
  edge?: number;
}) {
  if (!checks.length) return null;

  const passedWeight = checks.filter((c) => c.pass).reduce((s, c) => s + c.weight, 0);
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const agreementPct = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/25">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/85">
              Rule engine output
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">9 deterministic checks · live bar</h2>
          </div>
          <div className="flex gap-4 text-right text-sm">
            {confidence != null && (
              <div>
                <p className="text-[10px] uppercase text-white/40">Confidence</p>
                <p className="font-bold text-white">{confidence}%</p>
              </div>
            )}
            {edge != null && (
              <div>
                <p className="text-[10px] uppercase text-white/40">Edge</p>
                <p className="font-bold text-emerald-300">+{edge}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase text-white/40">Agreement</p>
              <p className="font-bold text-white">{agreementPct}%</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {checks.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      c.pass ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-rose-400/80",
                    )}
                  />
                  <p className="truncate text-xs text-white/75">{c.label}</p>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn("h-full rounded-full transition-all", c.pass ? "bg-emerald-500/80" : "bg-rose-500/40")}
                    style={{ width: `${c.pass ? 100 : Math.max(18, c.weight * 4)}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase text-white/35">w{c.weight}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-white/40">
          Same checks run in CLI backtest and SKILL.md — no LLM in the signal path.
        </p>
      </div>
    </section>
  );
}
