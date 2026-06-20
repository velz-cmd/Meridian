"use client";

import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { HISTORICAL_ANALOGS } from "@/lib/meridian-intelligence-data";
import { cn } from "@/lib/utils";

/** Stored historical episodes for similarity search — not live predictions. Library spans 2023–2026. */
export function GateMarketTimeline({ symbol }: { symbol: string }) {
  const periods = useMemo(
    () =>
      HISTORICAL_ANALOGS.map((a) => ({
        id: a.id,
        label: a.label,
        period: a.period,
        regime: a.regime,
        fearGreed: a.fearGreed,
        implication: a.implication,
        outcome: a.outcomes[symbol.toUpperCase()] ?? a.outcomes.BNB ?? 0,
      })),
    [symbol],
  );

  const [idx, setIdx] = useState(periods.length - 1);

  const active = periods[idx] ?? periods[0]!;

  return (
    <section className="rounded-2xl border border-violet-400/20 bg-black/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-violet-300" />
        <h3 className="text-sm font-semibold text-white">Market Replay · historical reference</h3>
      </div>
      <p className="mb-3 text-[10px] text-white/45">
        Slide through stored historical episodes (Oct 2023 → Jun 2026). Similarity engine compares today&apos;s live
        CMC snapshot to these — references only, not trade signals.
      </p>
      <input
        type="range"
        min={0}
        max={periods.length - 1}
        value={idx}
        onChange={(e) => setIdx(Number(e.target.value))}
        className="w-full accent-violet-500"
        aria-label="Market timeline period"
      />
      <div className="mt-2 flex justify-between font-mono text-[9px] text-white/35">
        {periods.map((p, i) => (
          <span key={p.id} className={cn(i === idx && "text-violet-300")}>
            {p.period}
          </span>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/35 px-3 py-3 text-xs">
        <p className="font-semibold text-violet-200">{active.label}</p>
        <p className="mt-1 text-white/55">
          Regime {active.regime} · F&G {active.fearGreed} · {symbol} historical outcome +{active.outcome}%
        </p>
        <p className="mt-2 text-white/70">{active.implication}</p>
        <p className="mt-2 font-mono text-[9px] italic text-white/35">
          MERIDIAN would cite this analog for similarity search — not as a trade signal.
        </p>
      </div>
    </section>
  );
}
