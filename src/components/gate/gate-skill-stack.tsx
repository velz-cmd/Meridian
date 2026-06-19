"use client";

import { cn } from "@/lib/utils";
import { strategyPosition } from "@/lib/gate-strategy-copy";

type SkillSignal = {
  id: string;
  name: string;
  signal: string;
};

type SkillMomentum = SkillSignal & {
  checksPassed: number;
  checksTotal: number;
  metrics?: { rsi?: number; macd?: string; fearGreed?: number };
};

type SkillSentiment = SkillSignal & {
  state: string;
  flagged: boolean;
  socialHeat: number;
  flowScore: number;
  turnover: number;
  thesis: string;
};

type SkillRegime = SkillSignal & {
  regime: string;
  positioning: string;
  strategyMode: string;
  switchRule: string;
};

type SkillTrend = SkillSignal & {
  checksPassed: number;
  checksTotal: number;
  metrics?: { change1h?: number; change24h?: number; change7d?: number; change30d?: number | null };
  thesis: string;
};

type SkillLiquidity = SkillSignal & {
  checksPassed: number;
  checksTotal: number;
  turnover: number;
  volumeChange24h?: number | null;
  thesis: string;
};

type SkillStructural = SkillSignal & {
  grade: string;
  checksPassed: number;
  checksTotal: number;
  metrics?: { marketCap?: number; cmcRank?: number | null; fdvRatio?: number | null };
  thesis: string;
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
  trend?: SkillTrend;
  liquidity?: SkillLiquidity;
  structural?: SkillStructural;
  relativeStrength?: SkillSignal & {
    role?: string;
    rotationScore?: number;
    metrics?: { rs24h?: number; rs7d?: number; benchmark?: string };
    thesis?: string;
    checksPassed?: number;
    checksTotal?: number;
  };
  volatility?: SkillSignal & {
    state?: string;
    squeeze?: boolean;
    expansion?: boolean;
    metrics?: { atrPct?: number; compressionRatio?: number };
    thesis?: string;
    checksPassed?: number;
    checksTotal?: number;
  };
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

  const layers = [
    {
      title: "Momentum",
      subtitle: `${skills.momentum.checksPassed}/${skills.momentum.checksTotal} checks`,
      signal: skills.momentum.signal,
      detail: skills.momentum.metrics
        ? `RSI ${skills.momentum.metrics.rsi?.toFixed(1)} · MACD ${skills.momentum.metrics.macd} · F&G ${skills.momentum.metrics.fearGreed}`
        : undefined,
    },
    {
      title: "Sentiment divergence",
      subtitle: skills.sentiment.state.replace(/_/g, " ").toLowerCase(),
      signal: skills.sentiment.signal,
      detail: `heat ${skills.sentiment.socialHeat} · flow ${skills.sentiment.flowScore} · turnover ${skills.sentiment.turnover}`,
      flagged: skills.sentiment.flagged,
    },
    {
      title: "Regime",
      subtitle: `${skills.regime.regime} · ${skills.regime.positioning.replace(/-/g, " ")}`,
      signal: skills.regime.signal,
      detail: skills.regime.switchRule,
    },
    ...(skills.trend
      ? [
          {
            title: "Trend alignment",
            subtitle: `${skills.trend.checksPassed}/${skills.trend.checksTotal} TF checks`,
            signal: skills.trend.signal,
            detail: skills.trend.metrics
              ? `1h ${skills.trend.metrics.change1h?.toFixed(1)}% · 24h ${skills.trend.metrics.change24h?.toFixed(1)}% · 7d ${skills.trend.metrics.change7d?.toFixed(1)}%`
              : skills.trend.thesis,
          },
        ]
      : []),
    ...(skills.liquidity
      ? [
          {
            title: "Liquidity depth",
            subtitle: `turnover ${skills.liquidity.turnover}`,
            signal: skills.liquidity.signal,
            detail: skills.liquidity.thesis,
          },
        ]
      : []),
    ...(skills.structural
      ? [
          {
            title: "Structural quality",
            subtitle: skills.structural.grade,
            signal: skills.structural.signal,
            detail: skills.structural.thesis,
          },
        ]
      : []),
    ...(skills.relativeStrength
      ? [
          {
            title: "Relative strength",
            subtitle: `${skills.relativeStrength.role ?? "inline"} · ${skills.relativeStrength.rotationScore ?? "—"}/100`,
            signal: skills.relativeStrength.signal,
            detail: skills.relativeStrength.metrics
              ? `RS 24h ${(skills.relativeStrength.metrics.rs24h ?? 0) >= 0 ? "+" : ""}${skills.relativeStrength.metrics.rs24h?.toFixed(2)}% vs ${skills.relativeStrength.metrics.benchmark}`
              : skills.relativeStrength.thesis,
          },
        ]
      : []),
    ...(skills.volatility
      ? [
          {
            title: "Volatility regime",
            subtitle: skills.volatility.state ?? "neutral",
            signal: skills.volatility.signal,
            detail: skills.volatility.metrics
              ? `ATR ${skills.volatility.metrics.atrPct}% · ${skills.volatility.metrics.compressionRatio}× compression`
              : skills.volatility.thesis,
          },
        ]
      : []),
  ];

  return (
    <section className="rounded-2xl border border-cyan-400/15 bg-cyan-950/15">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">
              CMC skill stack · {layers.length} layers · live
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Eight deterministic skills → constitution</h2>
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {layers.map((layer) => (
            <SkillCard
              key={layer.title}
              title={layer.title}
              subtitle={layer.subtitle}
              signal={layer.signal}
              detail={layer.detail}
              flagged={"flagged" in layer ? layer.flagged : undefined}
            />
          ))}
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
