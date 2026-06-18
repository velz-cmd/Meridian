"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type GateStatus = {
  cmc?: { live?: boolean; fearGreed?: number | null };
  symbols?: string[];
};

export function MeridianProblemSection({ className }: { className?: string }) {
  const [status, setStatus] = useState<GateStatus | null>(null);

  useEffect(() => {
    void fetch("/api/gate/status", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const fg = status?.cmc?.fearGreed ?? 50;
  const live = status?.cmc?.live ?? false;

  return (
    <section className={cn("relative z-10 mx-auto max-w-[1680px] px-4 py-12 sm:px-6 sm:py-16", className)}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-rose-300/80">The problem</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-white sm:text-3xl">
            Same BUY on every token.
            <span className="block text-white/55">No rule book. No permit.</span>
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/55">
            Retail and agents chase momentum without a constitution — capital lands on the wrong name,
            execution fires before checks pass, and every dashboard shows a different price. MERIDIAN
            closes the loop: one live feed, scored skills, ranked router, permit before wallet.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <StatCard
            label="Benchmarks watched"
            value={String(status?.symbols?.length ?? 4)}
            sub="BNB · CAKE · FLOKI · XVS"
          />
          <StatCard
            label="Market feed"
            value={live ? "Live" : "Syncing"}
            sub={live ? "Quotes updating" : "Using last good batch"}
            accent={live ? "text-emerald-300" : "text-amber-300"}
          />
          <StatCard label="Rule checks" value="9" sub="Per symbol · every scan" />
          <StatCard label="Sentiment" value={String(fg)} sub="Fear & Greed index" />
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent = "text-white",
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/35 px-3 py-3 sm:px-4 sm:py-4">
      <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums sm:text-2xl", accent)}>{value}</p>
      <p className="mt-1 text-[10px] leading-snug text-white/45">{sub}</p>
    </div>
  );
}
