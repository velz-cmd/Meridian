"use client";

import { Scale, GitBranch, Shield, Layers } from "lucide-react";
import { NexusAgentPulseStrip } from "@/components/nexus/nexus-agent-pulse-strip";
import { NexusDirectionDesk } from "@/components/nexus/nexus-direction-desk";
import { GateCapitalRotation } from "@/components/gate/gate-capital-rotation";
import { GateCmcSkillStrip } from "@/components/gate/gate-cmc-skill-strip";
import { GateConsensusPanel } from "@/components/gate/gate-consensus-panel";
import { GateExecutionDesk } from "@/components/gate/gate-execution-desk";
import { GateOutputPanel } from "@/components/gate/gate-output-panel";
import { GateSkillStack } from "@/components/gate/gate-skill-stack";
import { GateCollapsibleCard, GateStatPill } from "@/components/gate/gate-collapsible-card";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import type { GateJudgeConsensus } from "@/lib/gate-consensus-payload";
import type { MeridianIntelligencePayload } from "@/lib/meridian-intelligence-types";
import type { GateBenchmarkFull, GateRoutePayload } from "@/lib/gate-route-types";
import type { MarketPulse } from "@/lib/market-pulse";
import type { PositionRoute } from "@/lib/position-router";
import { effectiveGateSignal } from "@/lib/gate-effective-signal";
import { cn } from "@/lib/utils";

type BacktestPayload = Parameters<typeof GateOutputPanel>[0]["backtest"];

export function GateOverviewTab({
  symbol,
  selected,
  skills,
  judgeConsensus,
  intelligence,
  intelLoading,
  route,
  positionRoute,
  directionLoading,
  marketPulse,
  pulseLoading,
  gateRoute,
  benchmarks,
  gateRouteLoading,
  backtest,
  backtestLoading,
  backtestRequested,
  onQuickSelect,
  onRunBacktest,
  onGoTab,
}: {
  symbol: string;
  selected?: GateBenchmarkFull;
  skills?: GateSkillsPayload;
  judgeConsensus: GateJudgeConsensus | null;
  intelligence: MeridianIntelligencePayload | null;
  intelLoading: boolean;
  route: GateRoutePayload | null;
  positionRoute: PositionRoute | null;
  directionLoading: boolean;
  marketPulse: MarketPulse | null;
  pulseLoading: boolean;
  gateRoute: GateRoutePayload | null;
  benchmarks: GateBenchmarkFull[];
  gateRouteLoading: boolean;
  backtest: BacktestPayload;
  backtestLoading: boolean;
  backtestRequested: boolean;
  onQuickSelect: (sym: import("@/lib/gate-constants").GateSymbol) => void;
  onRunBacktest: () => void;
  onGoTab: (tab: "memory" | "technical" | "rules" | "replay") => void;
}) {
  const verdict = intelligence?.verdict ?? (judgeConsensus?.permit.status === "GRANT" ? "GRANT" : "DENY");
  const conviction = intelligence?.confidence.conviction ?? selected?.gate.confidence ?? "—";
  const spread = intelligence?.confidence.bullBearSpread ?? judgeConsensus?.weights.bearPct ?? "—";
  const horizon = intelligence?.convictionDecay.reviewAfterHours ?? "—";
  const riskRegime = intelligence?.genome.regime ?? selected?.gate.regime ?? "neutral";
  const thesis =
    intelligence?.explainability.why ??
    skills?.composite.thesis ??
    selected?.gate.thesis ??
    "Awaiting live gate evaluation.";

  const constitutionActive =
    intelligence?.constitution.filter((a) => a.status === "active").length ??
    judgeConsensus?.votes.long ??
    0;
  const constitutionTotal = intelligence?.constitution.length ?? 6;
  const constitutionViolated = intelligence?.constitution.filter((a) => a.status === "violated").length ?? 0;

  const narrativeLeader =
    intelligence?.narrativeFlow.likelyNextLeader.narrative ??
    intelligence?.genome.narrative ??
    "—";
  const migration = intelligence?.narrativeFlow.migration[0];

  const verdictColor =
    verdict === "GRANT"
      ? "border-emerald-400/40 bg-emerald-500/10"
      : verdict === "DENY"
        ? "border-rose-400/40 bg-rose-500/10"
        : verdict === "WAIT"
          ? "border-amber-400/40 bg-amber-500/10"
          : "border-white/20 bg-white/5";

  return (
    <div className="space-y-4">
      {/* 1. Verdict — answer first */}
      <section className={cn("rounded-2xl border px-5 py-5", verdictColor)}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">Hero verdict</p>
        <p className="mt-2 text-3xl font-bold text-white">{verdict}</p>
        <p className="mt-2 max-w-2xl text-sm text-white/80">
          {intelligence?.verdictReason ?? judgeConsensus?.permit.reason ?? "Live constitution + skill consensus."}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <GateStatPill label="Conviction" value={String(conviction)} sub="Evidence-derived" />
          <GateStatPill label="Bull–Bear spread" value={String(spread)} sub="Not probability" />
          <GateStatPill label="Risk regime" value={riskRegime} sub={`F&G ${intelligence?.genome.fearGreed ?? "—"}`} />
          <GateStatPill label="Expected horizon" value={`${horizon}h`} sub={`Thesis ${intelligence?.convictionDecay.status ?? "—"}`} />
          <GateStatPill
            label="Permit"
            value={judgeConsensus?.permit.status ?? "—"}
            sub={judgeConsensus?.cleared ? "Constitution cleared" : "Review court"}
          />
        </div>
      </section>

      {/* 2. Thesis */}
      <GateCollapsibleCard
        title="Thesis"
        question="Why should I care?"
        summary={<p className="line-clamp-3">{thesis}</p>}
        icon={Scale}
        accent="border-violet-400/20"
      >
        <p className="text-sm leading-relaxed text-white/75">{thesis}</p>
        {intelligence?.explainability.whyNow && (
          <p className="mt-3 text-xs text-white/50">{intelligence.explainability.whyNow}</p>
        )}
        <button type="button" className="mt-3 text-xs text-cyan-300 hover:underline" onClick={() => onGoTab("technical")}>
          Full debate & evidence → Technical tab
        </button>
      </GateCollapsibleCard>

      {/* 3. Constitution summary */}
      <GateCollapsibleCard
        title="Constitution summary"
        question="How does MERIDIAN judge?"
        summary={
          <span>
            {constitutionActive}/{constitutionTotal} articles active
            {constitutionViolated > 0 ? ` · ${constitutionViolated} violated` : ""} · liquidity veto enforced
          </span>
        }
        icon={Shield}
        accent="border-amber-400/15"
      >
        <ul className="space-y-2 text-[11px]">
          {(intelligence?.constitution ?? []).map((a) => (
            <li key={a.id} className="flex justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
              <span className="text-white/80">
                Article {a.id} · {a.title}
              </span>
              <span className="font-mono uppercase text-white/45">{a.status}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="mt-3 text-xs text-cyan-300 hover:underline" onClick={() => onGoTab("rules")}>
          Full rules & spec → Rules tab
        </button>
      </GateCollapsibleCard>

      {/* 4. Narrative summary */}
      <GateCollapsibleCard
        title="Narrative summary"
        question="Where is capital moving?"
        summary={
          <span>
            Leader: {narrativeLeader}
            {migration ? ` · ${migration.from} → ${migration.to}` : ""}
          </span>
        }
        icon={GitBranch}
        accent="border-cyan-400/15"
      >
        {intelligence?.narrativeFlow.radar.slice(0, 4).map((n) => (
          <div key={n.id} className="mb-2 flex items-center gap-2 text-xs">
            <span className="w-14 text-white/50">{n.label}</span>
            <div className="h-1.5 flex-1 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-violet-500/60" style={{ width: `${n.strength}%` }} />
            </div>
            <span className="w-8 text-right tabular-nums text-white/40">{n.strength}</span>
          </div>
        ))}
        <button type="button" className="mt-2 text-xs text-cyan-300 hover:underline" onClick={() => onGoTab("memory")}>
          Market memory & analogs → Memory tab
        </button>
      </GateCollapsibleCard>

      {/* Operational — execution path */}
      <GateExecutionDesk
        symbol={symbol}
        route={positionRoute}
        loading={directionLoading}
        deskSignal={selected ? effectiveGateSignal(selected.gate, skills) : undefined}
        permit={judgeConsensus?.permit.status === "GRANT" ? "GRANT" : "DENY"}
      />
      <NexusDirectionDesk route={positionRoute} loading={directionLoading} compact strategyOnly />
      <GateCapitalRotation benchmarks={benchmarks} route={gateRoute} />

      {intelLoading && !intelligence && (
        <p className="text-center text-xs text-white/40">Loading intelligence summaries…</p>
      )}

      {/* Progressive disclosure — ALL former overview modules preserved */}
      <GateCollapsibleCard
        title="Full gate analysis modules"
        question="Deep research · nothing removed"
        summary="Consensus, skill strip, live output, agent pulse — expand for complete desk view."
        icon={Layers}
        defaultOpen={false}
      >
        <div className="space-y-3">
          <NexusAgentPulseStrip pulse={marketPulse} loading={pulseLoading} symbol={symbol} compact />
          {judgeConsensus && <GateConsensusPanel consensus={judgeConsensus} />}
          {selected && (
            <>
              <GateCmcSkillStrip selected={selected} cmcLive={selected.cmcLive} skills={skills} />
              {skills && <GateSkillStack skills={skills} constitutionSignal={selected.gate.signal} />}
            </>
          )}
          <GateOutputPanel
            selected={selected}
            route={route}
            skills={skills ?? null}
            loading={gateRouteLoading}
            backtest={backtest}
            backtestLoading={backtestLoading}
            backtestRequested={backtestRequested}
            onQuickSelect={onQuickSelect}
            onRunBacktest={onRunBacktest}
            section="overview"
          />
        </div>
      </GateCollapsibleCard>
    </div>
  );
}
