"use client";

import Link from "next/link";
import { ArrowRight, Brain, Database, Layers, Scale } from "lucide-react";
import { summarizeArchitectureCoverage } from "@/lib/meridian-architecture";

const STACK = [
  { icon: Database, label: "CMC APIs", sub: "Price · Volume · F&G · Categories · Global metrics", color: "text-cyan-300 border-cyan-400/20" },
  { icon: Layers, label: "8 CMC Skills", sub: "Momentum · RS · Regime · Liquidity · Vol · Sentiment · Trend · Structure", color: "text-cyan-200 border-cyan-400/15" },
  { icon: Scale, label: "Bull & Bear Court", sub: "Weighted adversarial ensemble — not black-box AI", color: "text-amber-200 border-amber-400/20" },
  { icon: Brain, label: "Memory + Stress", sub: "Twin · Analog · DNA · Counterfactual · Decay · Constitution", color: "text-violet-200 border-violet-400/20" },
] as const;

export function MeridianIntelligencePipeline() {
  const summary = summarizeArchitectureCoverage();

  return (
    <section className="relative z-10 mx-auto max-w-[1680px] px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-3xl border border-violet-400/15 bg-gradient-to-b from-violet-950/30 to-black/40 p-5 sm:p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300/90">
              // CMC DATA → SKILLS → REASONING → OUTPUT
            </p>
            <h2 className="mt-2 max-w-2xl text-2xl font-semibold text-white sm:text-3xl">
              CMC provides the data.{" "}
              <span className="text-white/50">MERIDIAN provides the intelligence.</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm text-white/55">
              ~{summary.coveragePct}% of skills + reasoning layers are wired: {summary.cmcSkillCount} deterministic CMC skills
              feed Bull/Bear Court and Constitution; memory analogs are reference libraries, not live forecasts.
            </p>
          </div>
          <Link
            href="/gate"
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/35 bg-violet-500/10 px-4 py-2.5 text-sm text-violet-100 hover:bg-violet-500/20"
          >
            <Brain className="h-4 w-4" />
            Open Strategy desk
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mb-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
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

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Market Twin", d: "Live CMC snapshot vs historical episodes (2023–2026) — MERIDIAN algorithm, not a CMC endpoint" },
            { t: "Bull vs Bear Court", d: "9-layer weighted debate — architecture, not prompts" },
            { t: "Constitution", d: "6/9 votes · bear cap 15% · risk-off half size" },
            { t: "90-day Replay", d: "Constitution vs naive agent — backtest proof" },
          ].map((item) => (
            <div key={item.t} className="rounded-xl border border-white/[0.07] bg-black/30 px-3 py-3">
              <p className="text-sm font-semibold text-white">{item.t}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/45">{item.d}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center font-mono text-[10px] text-white/35">
          {summary.featureLive}/{summary.featureTotal} intelligence features live · Real data · No cosmetic intelligence ·{" "}
          Prefer WAIT over fake certainty ·{" "}
          <Link href="/gate" className="text-violet-300/80 hover:underline">
            evidence engine
          </Link>
        </p>
      </div>
    </section>
  );
}
