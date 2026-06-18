"use client";

import type { ReactNode } from "react";
import { Activity, Gauge, Radio, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type SkillsPayload = {
  momentum: {
    signal: string;
    action: string;
    confidence: number;
    metrics: { rsi: number; macd: string; fearGreed: number; change1h: number; change24h: number };
    checksPassed: number;
    checksTotal: number;
    entryRule: string;
    exitRule: string;
  };
  sentiment: {
    state: string;
    signal: string;
    flagged: boolean;
    socialHeat: number;
    flowScore: number;
    turnover: number;
    thesis: string;
  };
  regime: {
    regime: string;
    positioning: string;
    strategyMode: string;
    signal: string;
    metrics: { fearGreed: number; btcDominance: number | null; marketChange24h: number | null };
    switchRule: string;
  };
  composite: {
    signal: string;
    alignmentScore: number;
    blockers: string[];
    cleared: boolean;
    thesis: string;
  };
};

function signalTone(signal: string, flagged?: boolean) {
  if (flagged) return "text-amber-300 border-amber-400/35 bg-amber-500/10";
  if (signal === "ENTER_LONG") return "text-emerald-300 border-emerald-400/35 bg-emerald-500/10";
  if (signal === "EXIT" || signal === "AVOID") return "text-rose-300 border-rose-400/35 bg-rose-500/10";
  return "text-white/70 border-white/10 bg-black/30";
}

function Meter({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[9px] uppercase tracking-wider text-white/40">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

export function GateSkillsPanel({ skills }: { skills: SkillsPayload | null }) {
  if (!skills) return null;

  const { momentum, sentiment, regime, composite } = skills;

  return (
    <section className="grid gap-3 lg:grid-cols-3">
      <SkillCard icon={Zap} title="Momentum" signal={momentum.signal}>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="RSI" value={momentum.metrics.rsi.toFixed(1)} />
          <Metric label="MACD" value={momentum.metrics.macd} />
          <Metric label="F&G" value={String(Math.round(momentum.metrics.fearGreed))} />
        </div>
        <p className="text-[10px] text-white/45">
          {momentum.checksPassed}/{momentum.checksTotal} entry checks · exit if RSI&gt;78 or F&G&gt;88
        </p>
        <div className="flex gap-2 text-[10px]">
          <span className={cn("rounded-md border px-2 py-0.5", signalTone(momentum.signal))}>
            {momentum.signal.replace("_", " ")}
          </span>
          <span className="text-white/35">{momentum.action}</span>
        </div>
      </SkillCard>

      <SkillCard icon={Radio} title="Sentiment vs flow" signal={sentiment.signal} flagged={sentiment.flagged}>
        <Meter value={sentiment.socialHeat} label="Price heat" color="bg-violet-400" />
        <Meter value={sentiment.flowScore} label="Volume flow" color="bg-cyan-400" />
        <p className="text-xs leading-relaxed text-white/55">{sentiment.thesis}</p>
        <span
          className={cn(
            "inline-block rounded-md border px-2 py-0.5 text-[10px] font-medium",
            sentiment.flagged ? "border-amber-400/40 text-amber-200" : "border-emerald-400/30 text-emerald-200",
          )}
        >
          {sentiment.state.replace(/_/g, " ")}
        </span>
      </SkillCard>

      <SkillCard icon={Gauge} title="Regime" signal={regime.signal}>
        <div className="flex flex-wrap gap-2">
          <Badge label={regime.regime.replace("-", " ")} />
          <Badge label={regime.positioning.replace(/-/g, " ")} />
          <Badge label={`mode: ${regime.strategyMode}`} accent />
        </div>
        {regime.metrics.btcDominance != null && (
          <p className="text-[10px] text-white/45">
            BTC dom {regime.metrics.btcDominance.toFixed(1)}%
            {regime.metrics.marketChange24h != null &&
              ` · mkt ${regime.metrics.marketChange24h >= 0 ? "+" : ""}${regime.metrics.marketChange24h.toFixed(2)}%`}
          </p>
        )}
        <p className="text-xs text-white/50">{regime.switchRule}</p>
      </SkillCard>

      <div className="lg:col-span-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {composite.cleared ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : composite.blockers.length > 0 ? (
              <TrendingDown className="h-4 w-4 text-amber-400" />
            ) : (
              <Activity className="h-4 w-4 text-white/40" />
            )}
            <span className="text-sm font-medium text-white">
              Composite · {composite.alignmentScore}/100
            </span>
            <span className={cn("rounded-md border px-2 py-0.5 text-[10px]", signalTone(composite.signal))}>
              {composite.signal.replace("_", " ")}
            </span>
          </div>
          {composite.blockers.length > 0 && (
            <span className="text-[10px] text-amber-200/80">Blocked: {composite.blockers.join(" · ")}</span>
          )}
        </div>
        <p className="mt-1 text-xs text-white/50">{composite.thesis}</p>
      </div>
    </section>
  );
}

function SkillCard({
  icon: Icon,
  title,
  signal,
  flagged,
  children,
}: {
  icon: typeof Zap;
  title: string;
  signal: string;
  flagged?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-white/50" />
          <p className="text-sm font-semibold text-white">{title}</p>
        </div>
        <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium", signalTone(signal, flagged))}>
          {signal.replace("_", " ")}
        </span>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5">
      <p className="text-[9px] uppercase text-white/35">{label}</p>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function Badge({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] capitalize",
        accent ? "bg-violet-500/20 text-violet-200" : "bg-white/10 text-white/60",
      )}
    >
      {label}
    </span>
  );
}
