"use client";

import { Activity, BarChart3, Brain, Shield, Waves } from "lucide-react";
import { GateCollapsibleCard } from "@/components/gate/gate-collapsible-card";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import type { MeridianSkillEvidence } from "@/lib/meridian-skill-evidence";
import type { MeridianIntelligencePayload } from "@/lib/meridian-intelligence-types";
import { cn } from "@/lib/utils";

type SkillLayer = {
  title: string;
  subtitle: string;
  signal: string;
  detail?: string;
  flagged?: boolean;
};

function buildLayers(skills: GateSkillsPayload): SkillLayer[] {
  return [
    {
      title: "Momentum",
      subtitle: `${skills.momentum.checksPassed}/${skills.momentum.checksTotal} checks`,
      signal: skills.momentum.signal,
      detail: skills.momentum.metrics
        ? `RSI ${skills.momentum.metrics.rsi?.toFixed(1)} · MACD ${skills.momentum.metrics.macd} · F&G ${skills.momentum.metrics.fearGreed}`
        : undefined,
    },
    ...(skills.trend
      ? [
          {
            title: "Trend alignment",
            subtitle: `${skills.trend.checksPassed}/${skills.trend.checksTotal} TF checks`,
            signal: skills.trend.signal,
            detail: skills.trend.thesis,
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
            subtitle: `${skills.relativeStrength.role ?? "inline"}`,
            signal: skills.relativeStrength.signal,
            detail: skills.relativeStrength.thesis,
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
    {
      title: "Sentiment divergence",
      subtitle: skills.sentiment.state.replace(/_/g, " "),
      signal: skills.sentiment.signal,
      detail: `heat ${skills.sentiment.socialHeat} · flow ${skills.sentiment.flowScore}`,
      flagged: skills.sentiment.flagged,
    },
    ...(skills.volatility
      ? [
          {
            title: "Volatility regime",
            subtitle: skills.volatility.state ?? "neutral",
            signal: skills.volatility.signal,
            detail: skills.volatility.thesis,
          },
        ]
      : []),
    {
      title: "Market regime",
      subtitle: `${skills.regime.regime} · ${skills.regime.positioning}`,
      signal: skills.regime.signal,
      detail: skills.regime.switchRule,
    },
  ];
}

function signalTone(signal: string) {
  if (signal === "ENTER_LONG") return "text-emerald-300 border-emerald-400/35 bg-emerald-500/10";
  if (signal === "EXIT" || signal === "AVOID") return "text-rose-300 border-rose-400/35 bg-rose-500/10";
  return "text-white/70 border-white/10 bg-black/30";
}

function SkillDetail({ layer }: { layer: SkillLayer }) {
  return (
    <div className={cn("rounded-xl border p-3", signalTone(layer.signal))}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white">{layer.title}</p>
        <span className="text-[10px] font-bold uppercase">{layer.signal.replace(/_/g, " ")}</span>
      </div>
      <p className="mt-1 text-[11px] capitalize text-white/50">{layer.subtitle}</p>
      {layer.detail && <p className="mt-2 text-[11px] leading-snug text-white/60">{layer.detail}</p>}
      {layer.flagged && <p className="mt-2 text-[10px] font-semibold text-amber-300">Divergence flagged</p>}
    </div>
  );
}

function EvidenceBlock({ items }: { items: MeridianSkillEvidence[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {items.map((s) => (
        <div key={s.skill} className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2 text-[11px]">
          <div className="flex justify-between gap-2">
            <span className="font-semibold text-white">{s.skill}</span>
            <span className="font-mono text-cyan-200">{s.score}</span>
          </div>
          <p className="mt-1 font-mono text-[9px] text-white/40">
            {s.stance} · conf {s.confidence} · {s.dataSource}
          </p>
          <ul className="mt-1 space-y-0.5 text-[10px] text-white/50">
            {s.evidence.map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const CHAMBER_FILTERS: Record<
  string,
  { title: string; question: string; icon: typeof BarChart3; titles: string[]; evidenceKeys: string[] }
> = {
  market: {
    title: "Market Chamber",
    question: "Is structure aligned?",
    icon: BarChart3,
    titles: ["Momentum", "Trend alignment", "Structural quality"],
    evidenceKeys: ["Momentum", "Trend", "Structural"],
  },
  flow: {
    title: "Flow Chamber",
    question: "Is capital flowing in?",
    icon: Activity,
    titles: ["Relative strength", "Liquidity depth"],
    evidenceKeys: ["Relative strength", "Liquidity"],
  },
  behavior: {
    title: "Behavior Chamber",
    question: "What is sentiment doing?",
    icon: Waves,
    titles: ["Sentiment divergence"],
    evidenceKeys: ["Sentiment"],
  },
  risk: {
    title: "Risk Chamber",
    question: "What could hurt us?",
    icon: Shield,
    titles: ["Volatility regime", "Market regime"],
    evidenceKeys: ["Volatility", "Regime"],
  },
};

export function GateTechnicalChambers({
  skills,
  intelligence,
}: {
  skills: GateSkillsPayload;
  intelligence?: MeridianIntelligencePayload | null;
}) {
  const layers = buildLayers(skills);
  const evidence = intelligence?.skillEvidence ?? [];

  const pickLayers = (titles: string[]) => layers.filter((l) => titles.includes(l.title));
  const pickEvidence = (keys: string[]) =>
    evidence.filter((e) => keys.some((k) => e.skill.toLowerCase().includes(k.toLowerCase())));

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">
        Chambers · executive summary collapsed · expand for full quant research
      </p>

      {Object.entries(CHAMBER_FILTERS).map(([id, ch]) => {
        const chamberLayers = pickLayers(ch.titles);
        const chamberEvidence = pickEvidence(ch.evidenceKeys);
        const longCount = chamberLayers.filter((l) => l.signal === "ENTER_LONG").length;
        const Icon = ch.icon;

        return (
          <GateCollapsibleCard
            key={id}
            title={ch.title}
            question={ch.question}
            icon={Icon}
            summary={
              chamberLayers.length
                ? `${longCount}/${chamberLayers.length} layers long · ${chamberLayers.map((l) => l.title).join(", ")}`
                : "Awaiting layer data"
            }
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {chamberLayers.map((l) => (
                <SkillDetail key={l.title} layer={l} />
              ))}
            </div>
            <EvidenceBlock items={chamberEvidence} />
          </GateCollapsibleCard>
        );
      })}

      <GateCollapsibleCard
        title="Memory Chamber"
        question="Have we seen this before?"
        icon={Brain}
        summary={
          intelligence?.marketTwin
            ? `${intelligence.marketTwin.similarity}% similar to ${intelligence.marketTwin.label}`
            : "Historical analog + thesis DNA"
        }
      >
        {intelligence?.marketTwin && (
          <div className="space-y-2 text-sm text-white/70">
            <p>
              Twin: {intelligence.marketTwin.label} ({intelligence.marketTwin.similarity}%) · avg return{" "}
              {intelligence.marketTwin.avgHistoricalReturnPct}%
            </p>
            {intelligence.thesisDna && (
              <p className="text-xs text-white/50">
                DNA {intelligence.thesisDna.id} · momentum {intelligence.thesisDna.momentum} · RS{" "}
                {intelligence.thesisDna.relativeStrength}
              </p>
            )}
            {intelligence.thesisDna?.resemblanceNote && (
              <p className="text-xs text-amber-200/80">{intelligence.thesisDna.resemblanceNote}</p>
            )}
          </div>
        )}
      </GateCollapsibleCard>

      <p className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-[11px] text-white/55">
        Composite thesis: {skills.composite.thesis}
      </p>
    </div>
  );
}
