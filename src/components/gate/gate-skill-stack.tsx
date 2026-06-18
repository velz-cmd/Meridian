"use client";

import { cn } from "@/lib/utils";
import { strategyPosition } from "@/lib/gate-strategy-copy";

type SkillMomentum = {
  id: string;
  name: string;
  signal: string;
  checksPassed: number;
  checksTotal: number;
  metrics?: { rsi?: number; macd?: string; fearGreed?: number };
};

type SkillSentiment = {
  id: string;
  name: string;
  state: string;
  signal: string;
  flagged: boolean;
  socialHeat: number;
  flowScore: number;
  turnover: number;
  thesis: string;
};

type SkillRegime = {
  id: string;
  name: string;
  regime: string;
  positioning: string;
  strategyMode: string;
  signal: string;
  switchRule: string;
};

type SkillComposite = {
  signal: string;
  alignmentScore: number;
  blockers: string[];
  cleared: boolean;
  thesis: string;
};

export type GateSkillsPayload = {
  momentum: SkillMomentum;
  sentiment: SkillSentiment;
  regime: SkillRegime;
  composite: SkillComposite;
};

function signalTone(signal: string) {
  if (signal === "ENTER_LONG") return "text-emerald-300 border-emerald-400/35 bg-emerald-500/10";
  if (signal === "EXIT" || signal === "AVOID") return "text-rose-300 border-rose-400/35 bg-rose-500/10";
  return "text-white/70 border-white/10 bg-black/30";
}

export function GateSkillStack({ skills, constitutionSignal }: { skills: GateSkillsPayload; constitutionSignal: string }) {
  const compositePos = strategyPosition(skills.composite.signal);
  const rawPos = strategyPosition(constitutionSignal);
  const blocked = skills.composite.blockers.length > 0 && rawPos === "LONG" && compositePos === "FLAT";

  return (
    <section className="rounded-2xl border border-cyan-400/15 bg-cyan-950/15">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">
              Signal layers · live
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Momentum · Sentiment · Regime</h2>
            {blocked && (
              <p className="mt-1 text-xs text-amber-200/90">
                Constitution says LONG but composite blocked: {skills.composite.blockers.join(", ")}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-white/40">Combined read</p>
            <p className={cn("text-xl font-bold", compositePos === "LONG" ? "text-emerald-300" : "text-white/65")}>
              {compositePos}
            </p>
            <p className="text-[10px] text-white/40">{skills.composite.alignmentScore}/100 aligned</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <SkillCard
            title="Momentum"
            subtitle={`${skills.momentum.checksPassed}/${skills.momentum.checksTotal} checks`}
            signal={skills.momentum.signal}
            detail={
              skills.momentum.metrics
                ? `RSI ${skills.momentum.metrics.rsi?.toFixed(1)} · MACD ${skills.momentum.metrics.macd} · F&G ${skills.momentum.metrics.fearGreed}`
                : undefined
            }
          />
          <SkillCard
            title="Sentiment divergence"
            subtitle={skills.sentiment.state.replace(/_/g, " ").toLowerCase()}
            signal={skills.sentiment.signal}
            detail={`heat ${skills.sentiment.socialHeat} · flow ${skills.sentiment.flowScore} · turnover ${skills.sentiment.turnover}`}
            flagged={skills.sentiment.flagged}
          />
          <SkillCard
            title="Regime"
            subtitle={`${skills.regime.regime} · ${skills.regime.positioning.replace(/-/g, " ")}`}
            signal={skills.regime.signal}
            detail={skills.regime.switchRule}
          />
        </div>

        <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
          {skills.composite.thesis}
        </p>
      </div>
    </section>
  );
}

function SkillCard({
  title,
  subtitle,
  signal,
  detail,
  flagged,
}: {
  title: string;
  subtitle: string;
  signal: string;
  detail?: string;
  flagged?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border p-3", signalTone(signal))}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white">{title}</p>
        <span className="text-[10px] font-bold uppercase">{signal.replace("_", " ")}</span>
      </div>
      <p className="mt-1 text-[11px] capitalize text-white/50">{subtitle}</p>
      {detail && <p className="mt-2 text-[11px] leading-snug text-white/60">{detail}</p>}
      {flagged && <p className="mt-2 text-[10px] font-semibold text-amber-300">Divergence flagged</p>}
    </div>
  );
}
