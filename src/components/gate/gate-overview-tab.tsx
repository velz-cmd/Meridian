"use client";

import { Activity, Scale, GitBranch, Shield, Layers } from "lucide-react";
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
import { GATE_SYMBOL_LABELS } from "@/lib/gate-constants";
import { cn } from "@/lib/utils";

function formatGatePrice(price: number): string {
  if (price <= 0) return "—";
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(3);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(8);
}

function formatPct(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
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
  const spread = intel?.confidence.bullBearSpread ?? judgeConsensus?.weights.bearPct ?? "—";
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
    intel?.narrativeFlow.likelyNextLeader.narrative ??
    intel?.genome.narrative ??
    "—";
  const migration = intel?.narrativeFlow.migration[0];

  const livePrice = selected?.market.price ?? 0;
  const live24h = selected?.market.change24h;
  const live7d = selected?.market.change7d;
  const cmcLive = selected?.cmcLive ?? false;
  const asOf = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

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
      {/* Live market strip — symbol-scoped CMC snapshot */}
      <section className="rounded-2xl border border-cyan-400/25 bg-cyan-500/5 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/80">
                Live market · {GATE_SYMBOL_LABELS[symUpper as keyof typeof GATE_SYMBOL_LABELS] ?? symUpper}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                ${formatGatePrice(livePrice)}
                <span className="ml-3 text-sm font-normal text-white/55">
                  24h {formatPct(live24h)}
                  {live7d != null && <> · 7d {formatPct(live7d)}</>}
                </span>
              </p>
              <p className="mt-1 text-[11px] text-white/45">
                {cmcLive ? "CMC live feed" : "CMC unavailable — venue fallback"}
                {intelPending ? " · refreshing intelligence…" : intel ? " · intelligence synced" : ""}
                {" · "}
                As of {asOf}
              </p>
            </div>
          </div>
          {selected?.gate && (
            <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-right">
              <p className="font-mono text-[9px] uppercase text-white/40">Gate signal</p>
              <p className="text-sm font-semibold text-white">{selected.gate.signal.replace(/_/g, " ")}</p>
              <p className="font-mono text-[10px] text-white/45">
                {selected.gate.checksPassed}/{selected.gate.checksTotal} checks
              </p>
            </div>
          )}
        </div>
        <p className="mt-2 font-mono text-[9px] text-white/35">
          Analysis uses live CMC quotes for all four BSC benchmarks (BNB · CAKE · FLOKI · XVS Venus). Swaps settle on
          BSC Testnet (Chapel) — not mainnet paper trading.
        </p>
      </section>

      {/* 1. Verdict — answer first */}
      <section className={cn("rounded-2xl border px-5 py-5", verdictColor)}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">Hero verdict</p>
        <p className="mt-2 text-3xl font-bold text-white">{verdict}</p>
        <p className="mt-2 max-w-2xl text-sm text-white/80">
          {intel?.verdictReason ?? judgeConsensus?.permit.reason ?? selected?.gate.thesis ?? "Live constitution + skill consensus."}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <GateStatPill label="Conviction" value={String(conviction)} sub="Evidence-derived" />
          <GateStatPill label="Bull–Bear spread" value={String(spread)} sub="Not probability" />
          <GateStatPill label="Risk regime" value={riskRegime} sub={`F&G ${intel?.genome.fearGreed ?? selected?.market.fearGreed ?? "—"}`} />
          <GateStatPill label="Expected horizon" value={`${horizon}h`} sub={`Thesis ${intel?.convictionDecay.status ?? "—"}`} />
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
        {intel?.explainability.whyNow && (
          <p className="mt-3 text-xs text-white/50">{intel.explainability.whyNow}</p>
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
          {(intel?.constitution ?? []).map((a) => (
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
        {intel?.narrativeFlow.radar.slice(0, 4).map((n) => (
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
