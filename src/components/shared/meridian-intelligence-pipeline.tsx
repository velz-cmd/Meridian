"use client";

import { Database, Layers, Scale, Sparkles } from "lucide-react";

const STACK = [
  { icon: Database, label: "Market data", sub: "Price · volume · sentiment · global metrics", color: "text-cyan-300 border-cyan-400/20" },
  { icon: Layers, label: "Eight skills", sub: "Momentum · regime · liquidity · trend · structure", color: "text-cyan-200 border-cyan-400/15" },
  { icon: Scale, label: "Bull & Bear Court", sub: "Weighted evidence from both sides", color: "text-amber-200 border-amber-400/20" },
  { icon: Sparkles, label: "Memory & replay", sub: "Historical analogs · constitution · backtest", color: "text-violet-200 border-violet-400/20" },
] as const;

export function MeridianIntelligencePipeline() {
  return (
    <section className="relative z-10 mx-auto max-w-[1680px] px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-3xl border border-violet-400/15 bg-gradient-to-b from-violet-950/30 to-black/40 p-5 sm:p-8">
        <div className="mb-6 max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-300/80">
            How it works
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
            CMC provides the data.{" "}
            <span className="text-white/50">MERIDIAN provides the intelligence.</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm text-white/55">
            Live market feeds flow through deterministic skills, adversarial court debate, and a constitution
            permit before any trade reaches the wallet.
          </p>
        </div>

        <div className="mb-2 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          {STACK.map((layer, i) => (
            <div key={layer.label} className="flex items-center gap-2">
              <div className={`rounded-xl border bg-black/30 px-4 py-3 ${layer.color.split(" ").slice(1).join(" ")}`}>
                <div className="flex items-center gap-2">
                  <layer.icon className={`h-4 w-4 ${layer.color.split(" ")[0]}`} />
                  <div>
                    <p className="text-sm font-semibold text-white">{layer.label}</p>
                    <p className="text-[10px] text-white/45">{layer.sub}</p>
                  </div>
                </div>
              </div>
              {i < STACK.length - 1 && (
                <span className="hidden text-white/25 sm:inline" aria-hidden>
                  ↓
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
