"use client";

import Link from "next/link";
import { ArrowRight, Brain, Scale, TrendingUp } from "lucide-react";

const PIPELINE = [
  { step: "Market Memory", desc: "Living genome library — every day encoded" },
  { step: "Market Twin", desc: "Historical analog matching with differences" },
  { step: "Narrative Flow", desc: "Capital migration across themes" },
  { step: "Bull & Bear Court", desc: "Adversarial debate, not one AI voice" },
  { step: "Counterfactual", desc: "What-if stress on conviction" },
  { step: "Conviction Decay", desc: "When the thesis expires" },
  { step: "Constitution", desc: "Rules before wallet — 6 articles" },
  { step: "Evolution", desc: "Strategy mutates from backtest proof" },
] as const;

export function MeridianIntelligencePipeline() {
  return (
    <section className="relative z-10 mx-auto max-w-[1680px] px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-3xl border border-violet-400/15 bg-gradient-to-b from-violet-950/30 to-black/40 p-5 sm:p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-violet-300/90">
              // MARKET MEMORY ENGINE
            </p>
            <h2 className="mt-2 max-w-2xl text-2xl font-semibold text-white sm:text-3xl">
              Not another signal generator.{" "}
              <span className="text-white/50">A system that remembers.</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm text-white/55">
              Professional traders ask why an opportunity exists, who disagrees, and what breaks the thesis. MERIDIAN
              answers ten questions — regime, narrative, court, counterfactual, decay, constitution — as one pipeline.
            </p>
          </div>
          <Link
            href="/gate"
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/35 bg-violet-500/10 px-4 py-2.5 text-sm text-violet-100 hover:bg-violet-500/20"
          >
            <Brain className="h-4 w-4" />
            Open Intelligence desk
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((item, i) => (
            <div
              key={item.step}
              className="rounded-xl border border-white/[0.07] bg-black/30 px-3 py-3"
            >
              <p className="font-mono text-[9px] text-violet-400/80">{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-1 text-sm font-semibold text-white">{item.step}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/45">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-2 rounded-xl border border-cyan-400/15 bg-cyan-500/5 p-3 text-xs text-white/60">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
            <span>Market Twin — “Current market resembles October 2023” with outcome context</span>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-500/5 p-3 text-xs text-white/60">
            <Scale className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>Bull vs Bear Court — weighted adversarial layers, not black-box AI</span>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-3 text-xs text-white/60">
            <Brain className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <span>Constitution + backtest proof — 90-day replay vs naive agent</span>
          </div>
        </div>
      </div>
    </section>
  );
}
