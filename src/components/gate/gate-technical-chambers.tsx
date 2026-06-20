"use client";

import { Activity, BarChart3, Brain, Shield, Waves } from "lucide-react";
import { GateCollapsibleCard } from "@/components/gate/gate-collapsible-card";
import { GateSkillLayerCard } from "@/components/gate/gate-skill-layer-card";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import {
  buildGateSkillLayers,
  CHAMBER_LAYER_TITLES,
  chamberSummary,
  pickLayersByTitle,
} from "@/lib/gate-skill-layers";
import type { MeridianSkillEvidence } from "@/lib/meridian-skill-evidence";
import type { MeridianIntelligencePayload } from "@/lib/meridian-intelligence-types";

function EvidenceBlock({ items }: { items: MeridianSkillEvidence[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4 border-t border-white/[0.06] pt-4">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-white/35">Skill evidence bundle</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((s) => (
          <div key={s.skill} className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2 text-[11px]">
            <div className="flex justify-between gap-2">
              <span className="font-semibold text-white">{s.skill}</span>
              <span className="font-mono tabular-nums text-cyan-200/90">{s.score}</span>
            </div>
            <p className="mt-1 text-[10px] text-white/40">
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
    </div>
  );
}

const CHAMBERS: {
  id: keyof typeof CHAMBER_LAYER_TITLES;
  title: string;
  question: string;
  icon: typeof BarChart3;
  evidenceKeys: string[];
}[] = [
  {
    id: "market",
    title: "Market Chamber",
    question: "Is structure aligned?",
    icon: BarChart3,
    evidenceKeys: ["Momentum", "Trend", "Structural"],
  },
  {
    id: "flow",
    title: "Flow Chamber",
    question: "Is capital flowing in?",
    icon: Activity,
    evidenceKeys: ["Relative strength", "Liquidity"],
  },
  {
    id: "behavior",
    title: "Behavior Chamber",
    question: "What is sentiment doing?",
    icon: Waves,
    evidenceKeys: ["Sentiment"],
  },
  {
    id: "risk",
    title: "Risk Chamber",
    question: "What could hurt us?",
    icon: Shield,
    evidenceKeys: ["Volatility", "Regime"],
  },
];

export function GateTechnicalChambers({
  skills,
  intelligence,
}: {
  skills: GateSkillsPayload;
  intelligence?: MeridianIntelligencePayload | null;
}) {
  const layers = buildGateSkillLayers(skills);
  const evidence = intelligence?.skillEvidence ?? [];

  const pickEvidence = (keys: string[]) =>
    evidence.filter((e) => keys.some((k) => e.skill.toLowerCase().includes(k.toLowerCase())));

  return (
    <div className="gate-v2-stack space-y-5">
      <p className="text-sm text-white/50">
        Five chambers · summary collapsed · expand each layer for live CMC metrics
      </p>

      {CHAMBERS.map((ch) => {
        const chamberLayers = pickLayersByTitle(layers, CHAMBER_LAYER_TITLES[ch.id]);
        const Icon = ch.icon;
        return (
          <GateCollapsibleCard
            key={ch.id}
            title={ch.title}
            question={ch.question}
            icon={Icon}
            summary={chamberSummary(chamberLayers)}
            defaultOpen={false}
          >
            <div className="space-y-2">
              {chamberLayers.map((l) => (
                <GateSkillLayerCard key={l.id} layer={l} />
              ))}
            </div>
            <EvidenceBlock items={pickEvidence(ch.evidenceKeys)} />
          </GateCollapsibleCard>
        );
      })}

      <GateCollapsibleCard
        title="Memory Chamber"
        question="Have we seen this before?"
        icon={Brain}
        defaultOpen={false}
        summary={
          intelligence?.marketTwin
            ? `${intelligence.marketTwin.similarity}% similar to ${intelligence.marketTwin.label} (${intelligence.marketTwin.period})`
            : "Historical analog + thesis DNA from live snapshot"
        }
      >
        {intelligence?.marketTwin ? (
          <div className="space-y-3 text-sm text-white/70">
            <p>
              Twin: <span className="text-white">{intelligence.marketTwin.label}</span> ·{" "}
              {intelligence.marketTwin.similarity}% match · avg historical return{" "}
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
        ) : (
          <p className="text-sm text-white/45">Loading intelligence memory…</p>
        )}
      </GateCollapsibleCard>

      <p className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 text-sm leading-relaxed text-white/65">
        {skills.composite.thesis}
      </p>
    </div>
  );
}
