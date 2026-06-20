"use client";

import { cn } from "@/lib/utils";
import { strategyPosition } from "@/lib/gate-strategy-copy";
import { buildGateSkillLayers } from "@/lib/gate-skill-layers";
import { GateSkillLayerCard } from "@/components/gate/gate-skill-layer-card";

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
  composite: SkillComposite & {
    constitutionSignal?: string;
    constitutionOnly?: boolean;
    longPct?: number;
    holdPct?: number;
    bearPct?: number;
    votes?: { long: number; hold: number; bear: number; total: number };
    coreStack?: { long: number; required: number; passed: boolean };
    permit?: { status: "GRANT" | "DENY"; execute: string; reason?: string };
  };
};

export function GateSkillStack({ skills, constitutionSignal }: { skills: GateSkillsPayload; constitutionSignal: string }) {
  const compositePos = strategyPosition(skills.composite.signal);
  const rawPos = strategyPosition(constitutionSignal);
  const blocked = skills.composite.blockers.length > 0 && rawPos === "LONG" && compositePos === "FLAT";
  const splitVerdict = skills.composite.constitutionOnly;
  const layers = buildGateSkillLayers(skills);

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-black/25">
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-white/45">CMC skill stack · {layers.length} layers · live feed</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">Eight skills → one consensus</h2>
            {splitVerdict && (
              <p className="mt-2 text-xs leading-relaxed text-amber-200/85">
                Constitution says {rawPos} but only {skills.composite.votes?.long ?? 0}/
                {skills.composite.votes?.total ?? 8} layers agree — desk holds {compositePos} until aligned.
              </p>
            )}
            {blocked && !splitVerdict && (
              <p className="mt-2 text-xs leading-relaxed text-amber-200/85">
                Constitution says LONG but composite blocked: {skills.composite.blockers.join(", ")}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40">Combined read</p>
            <p
              className={cn(
                "text-3xl font-semibold tabular-nums tracking-tight",
                compositePos === "LONG" ? "text-emerald-300" : "text-white/60",
              )}
            >
              {compositePos}
            </p>
            <p className="mt-0.5 text-[11px] text-white/40">
              Alignment {skills.composite.alignmentScore}
              {skills.composite.votes
                ? ` · ${skills.composite.votes.long}L ${skills.composite.votes.hold}H ${skills.composite.votes.bear}B`
                : ""}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {layers.map((layer) => (
            <GateSkillLayerCard key={layer.id} layer={layer} />
          ))}
        </div>

        <p className="rounded-xl border border-white/[0.06] bg-black/30 px-4 py-3 text-sm leading-relaxed text-white/70">
          {skills.composite.thesis}
        </p>
      </div>
    </section>
  );
}
