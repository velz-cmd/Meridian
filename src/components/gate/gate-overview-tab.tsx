"use client";

import { Activity, Scale, GitBranch, Shield, Layers } from "lucide-react";
import { NexusAgentPulseStrip } from "@/components/nexus/nexus-agent-pulse-strip";
import { GateCmcSkillStrip } from "@/components/gate/gate-cmc-skill-strip";
import { GateConsensusPanel } from "@/components/gate/gate-consensus-panel";
import { GateOutputPanel } from "@/components/gate/gate-output-panel";
import { GateSkillStack } from "@/components/gate/gate-skill-stack";
import { GateCollapsibleCard, GateStatPill } from "@/components/gate/gate-collapsible-card";
import { GateOverviewExecutionPath } from "@/components/gate/gate-overview-execution-path";
import { GateSectionLink } from "@/components/gate/gate-section-link";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import type { GateJudgeConsensus } from "@/lib/gate-consensus-payload";
import type { MeridianIntelligencePayload } from "@/lib/meridian-intelligence-types";
import type { GateBenchmarkFull, GateRoutePayload } from "@/lib/gate-route-types";
import type { MarketPulse } from "@/lib/market-pulse";
import type { PositionRoute } from "@/lib/position-router";
import { effectiveGateSignal } from "@/lib/gate-effective-signal";
import { GATE_SYMBOL_LABELS } from "@/lib/gate-constants";
import { formatGatePrice, formatSignedPct } from "@/lib/gate-format";
import { getGateDeskTabMeta } from "@/lib/gate-desk-tab-meta";
import { cn } from "@/lib/utils";

function formatPct(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return formatSignedPct(n);
}

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
  onOpenNexus,
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
  onOpenNexus: () => void;
}) {
  const symUpper = symbol.toUpperCase();
  const intel = intelligence?.symbol?.toUpperCase() === symUpper ? intelligence : null;
  const intelPending = intelLoading && !intel;

  const verdict =
    intel?.verdict ??
    (judgeConsensus?.permit.status === "GRANT"
      ? "GRANT"
      : judgeConsensus?.permit.status === "DENY"
        ? "DENY"
        : selected?.gate && effectiveGateSignal(selected.gate, selected?.skills as GateSkillsPayload) === "ENTER_LONG"
          ? "GRANT"
          : "WAIT");
  const conviction = intel?.confidence.conviction ?? selected?.gate.confidence ?? selected?.conviction ?? "—";
  const spread =
    intel?.confidence.bullBearSpread ??
    (judgeConsensus
      ? Math.abs(judgeConsensus.weights.longPct - judgeConsensus.weights.bearPct)
      : undefined) ??
    "—";
  const horizon = intel?.convictionDecay.reviewAfterHours ?? "—";
  const riskRegime = intel?.genome.regime ?? selected?.gate.regime ?? selected?.skills?.regime?.regime ?? "neutral";
  const thesis =
    intel?.explainability.why ??
    skills?.composite?.thesis ??
    selected?.gate.thesis ??
    "Awaiting live gate evaluation.";

  const constitutionActive =
    intel?.constitution.filter((a) => a.status === "active").length ??
    judgeConsensus?.votes.long ??
    0;
  const constitutionTotal = intel?.constitution.length ?? 6;
  const constitutionViolated = intel?.constitution.filter((a) => a.status === "violated").length ?? 0;

  const narrativeLeader =
    intel?.narrativeFlow.likelyNextLeader.narrative ?? intel?.genome.narrative ?? "—";
  const migration = intel?.narrativeFlow.migration[0];

  const livePrice = selected?.market.price ?? 0;
  const live24h = selected?.market.change24h;
  const live7d = selected?.market.change7d;
  const cmcLive = selected?.cmcLive ?? false;
  const asOf = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  const verdictSurface =
    verdict === "GRANT"
      ? "border-emerald-400/25 bg-emerald-500/[0.06]"
      : verdict === "DENY"
        ? "border-rose-400/25 bg-rose-500/[0.06]"
        : verdict === "WAIT"
          ? "border-amber-400/25 bg-amber-500/[0.06]"
          : "border-white/[0.08] bg-black/25";

  return (
    <div className="gate-v2-stack space-y-6">
      {/* Live CMC strip — should I care? (price context only) */}
      <section className="rounded-2xl border border-white/[0.08] bg-black/25 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Activity className="mt-1 h-4 w-4 shrink-0 text-cyan-300/80" aria-hidden />
            <div>
              <p className="gate-live-kicker">
                Live market · {GATE_SYMBOL_LABELS[symUpper as keyof typeof GATE_SYMBOL_LABELS] ?? symUpper}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-white">
                ${formatGatePrice(livePrice)}
                <span className="ml-3 text-sm font-normal text-white/70">
                  24h {formatPct(live24h)}
                  {live7d != null && <> · 7d {formatPct(live7d)}</>}
                </span>
              </p>
              <p className="gate-meta-text mt-2">
                {cmcLive ? "CMC live feed" : "DATA UNAVAILABLE — venue fallback"}
                {intelPending ? " · refreshing intelligence…" : intel ? " · intelligence synced" : ""}
                {" · "}
                As of {asOf}
              </p>
            </div>
          </div>
          {selected?.gate && (
            <div className="rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-right">
              <p className="gate-stat-label">Gate signal</p>
              <p className="mt-1 text-sm font-semibold text-white">{selected.gate.signal.replace(/_/g, " ")}</p>
              <p className="gate-meta-text mt-0.5 tabular-nums">
                {selected.gate.checksPassed}/{selected.gate.checksTotal} checks
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 1. Verdict */}
      <section className={cn("rounded-2xl border px-6 py-6 sm:px-7 sm:py-7", verdictSurface)}>
        <p className="gate-verdict-label">Verdict</p>
        <p className="mt-2 text-4xl font-semibold tracking-tight text-white">{verdict}</p>
        <p className="gate-body-text mt-3 max-w-2xl">
          {intel?.verdictReason ?? judgeConsensus?.permit.reason ?? selected?.gate.thesis ?? "Live constitution + skill consensus."}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <GateStatPill label="Conviction" value={String(conviction)} sub="Evidence-derived" />
          <GateStatPill label="Bull–bear spread" value={String(spread)} sub="Not probability" />
          <GateStatPill label="Risk regime" value={riskRegime} sub={`F&G ${intel?.genome.fearGreed ?? selected?.market.fearGreed ?? "—"}`} />
          <GateStatPill label="Horizon" value={`${horizon}h`} sub={`Thesis ${intel?.convictionDecay.status ?? "—"}`} />
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
        defaultOpen={false}
      >
        <p className="gate-body-text">{thesis}</p>
        {intel?.explainability.whyNow && (
          <p className="mt-3 text-xs leading-relaxed text-white/50">{intel.explainability.whyNow}</p>
        )}
        <div className="mt-4">
          <GateSectionLink onClick={() => onGoTab("technical")} features={getGateDeskTabMeta("technical").features.slice(0, 3)}>
            Full debate and evidence
          </GateSectionLink>
        </div>
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
        defaultOpen={false}
      >
        <ul className="space-y-2">
          {(intel?.constitution ?? []).map((a) => (
            <li
              key={a.id}
              className="flex justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5 text-[12px]"
            >
              <span className="gate-body-text">
                Article {a.id} · {a.title}
              </span>
              <span className="gate-meta-text font-mono uppercase">{a.status}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <GateSectionLink onClick={() => onGoTab("rules")} features={getGateDeskTabMeta("rules").features.slice(0, 3)}>
            Full rules and spec
          </GateSectionLink>
        </div>
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
        defaultOpen={false}
      >
        {intel?.narrativeFlow.radar.slice(0, 4).map((n) => (
          <div key={n.id} className="mb-2 flex items-center gap-2 text-xs">
            <span className="w-14 text-white/50">{n.label}</span>
            <div className="h-1.5 flex-1 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-violet-500/50" style={{ width: `${n.strength}%` }} />
            </div>
            <span className="w-8 text-right tabular-nums text-white/40">{n.strength}</span>
          </div>
        ))}
        <div className="mt-3">
          <GateSectionLink onClick={() => onGoTab("memory")} features={getGateDeskTabMeta("memory").features.slice(0, 3)}>
            Market memory and analogs
          </GateSectionLink>
        </div>
      </GateCollapsibleCard>

      {/* Execution — primary CTA visible, full desk collapsed (V2) */}
      <GateOverviewExecutionPath
        symbol={symbol}
        selected={selected}
        skills={skills}
        positionRoute={positionRoute}
        directionLoading={directionLoading}
        gateRoute={gateRoute}
        benchmarks={benchmarks}
        permit={judgeConsensus?.permit.status === "GRANT" ? "GRANT" : "DENY"}
        onOpenNexus={onOpenNexus}
      />

      {intelPending && (
        <p className="text-center text-xs text-white/40">Refreshing intelligence for {symUpper}…</p>
      )}

      {/* Deep research — all former overview modules preserved */}
      <GateCollapsibleCard
        title="Full gate analysis"
        question="Deep research · nothing removed"
        summary="Consensus, skill strip, agent pulse, output panels — expand for complete desk view."
        icon={Layers}
        defaultOpen={false}
      >
        <div className="space-y-4">
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
