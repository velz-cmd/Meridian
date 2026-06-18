"use client";

import { Eye, GitBranch, Scale, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    n: "01",
    icon: Eye,
    title: "Watch",
    body: "Live market feed on BSC benchmarks — one price row everywhere.",
  },
  {
    n: "02",
    icon: Scale,
    title: "Score",
    body: "Momentum, sentiment, and regime skills run nine rule checks per symbol.",
  },
  {
    n: "03",
    icon: GitBranch,
    title: "Route",
    body: "Capital router ranks BNB · CAKE · FLOKI · XVS — no copy-paste signals.",
  },
  {
    n: "04",
    icon: ShieldCheck,
    title: "Permit",
    body: "Constitution desk clears or blocks execution before wallet signs.",
  },
] as const;

export function MeridianHowItWorks({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">How it works</p>
        <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">
          Watch → score → route → permit
        </h2>
        {!compact && (
          <p className="mt-1 max-w-2xl text-sm text-white/50">
            Autonomous pipeline — market data in, ranked conviction out, execution only when rules pass.
          </p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-emerald-400/90">{s.n}</span>
              <s.icon className="h-4 w-4 text-white/45" strokeWidth={1.5} />
            </div>
            <p className="mt-2 text-sm font-semibold text-white">{s.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
