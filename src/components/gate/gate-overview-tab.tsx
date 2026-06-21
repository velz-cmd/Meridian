"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, GitBranch, Scale, Shield, Terminal, Users } from "lucide-react";
import { formatSpecHash, SKILL_VERSION } from "@/lib/meridian-math";
import { MERIDIAN_PROD_URL } from "@/lib/meridian-brand";
import { GATE_SKILL_REPO } from "@/lib/gate-constants";
import { GateHorizonAllWindows } from "@/components/gate/gate-horizon-context";
import { GateCollapsibleCard, GateStatPill } from "@/components/gate/gate-collapsible-card";
import { GateOverviewExecutionPath } from "@/components/gate/gate-overview-execution-path";
import { GateSectionLink } from "@/components/gate/gate-section-link";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import type { GateJudgeConsensus } from "@/lib/gate-consensus-payload";
import type { MeridianIntelligencePayload } from "@/lib/meridian-intelligence-types";
import type { GateBenchmarkFull, GateRoutePayload } from "@/lib/gate-route-types";
import type { MarketPulse } from "@/lib/market-pulse";
import type { PositionRoute } from "@/lib/position-router";
import { GATE_SYMBOL_LABELS } from "@/lib/gate-constants";
import { formatGatePrice, formatSignedPct } from "@/lib/gate-format";
import { resolveGateOverviewTruth } from "@/lib/gate-overview-truth";
import type { GateHorizonId } from "@/lib/gate-desk-labels";
import { spotStateTone, verdictTierTone } from "@/lib/meridian-desk-states";
import { getGateDeskTabMeta } from "@/lib/gate-desk-tab-meta";
import type { GateArbitration } from "@/hooks/use-gate-permit";
import type { GatePermitStatus } from "@/lib/gate-permit-status";
import { cn } from "@/lib/utils";

function formatPct(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return formatSignedPct(n);
}

function formatUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export function GateOverviewTab({
  symbol,
  selected,
  skills,
  judgeConsensus,
  intelligence,
  intelLoading,
  positionRoute,
  directionLoading,
  gateRoute,
  benchmarks,
  permit,
  permitId,
  arbitration,
  onGoTab,
  onOpenNexus,
  onOpenAutopilot,
  track2Priority = false,
}: {
  symbol: string;
  selected?: GateBenchmarkFull;
  skills?: GateSkillsPayload;
  judgeConsensus: GateJudgeConsensus | null;
  intelligence: MeridianIntelligencePayload | null;
  intelLoading: boolean;
  positionRoute: PositionRoute | null;
  directionLoading: boolean;
  gateRoute: GateRoutePayload | null;
  benchmarks: GateBenchmarkFull[];
  permit?: GatePermitStatus;
  permitId?: string | null;
  arbitration?: GateArbitration | null;
  track2Priority?: boolean;
  onGoTab: (tab: "memory" | "technical" | "rules" | "replay") => void;
  onOpenNexus: () => void;
  onOpenAutopilot?: () => void;
}) {
  const symUpper = symbol.toUpperCase();
  const intel = intelligence?.symbol?.toUpperCase() === symUpper ? intelligence : null;
  const intelPending = intelLoading && !intel;

  // Default to the 24h window. Stable across refreshes — only reset when the
  // symbol changes, so a manual horizon pick never silently flips back.
  const [horizon, setHorizon] = useState<GateHorizonId>("daily");

  useEffect(() => {
    setHorizon("daily");
  }, [symUpper]);

  const trendMetrics = (
    skills as
      | { trend?: { metrics?: { change1h?: number; change24h?: number; change7d?: number; change30d?: number | null } } }
      | undefined
  )?.trend?.metrics;

  const marketCtx = useMemo(
    () => ({
      change1h: trendMetrics?.change1h ?? (selected?.fieldSources?.change1h as number | undefined),
      change24h: trendMetrics?.change24h ?? selected?.market.change24h,
      change7d: trendMetrics?.change7d ?? selected?.market.change7d,
      change30d: trendMetrics?.change30d ?? undefined,
    }),
    [trendMetrics, selected?.fieldSources, selected?.market.change24h, selected?.market.change7d],
  );

  const truth = resolveGateOverviewTruth({
    positionRoute,
    judgeConsensus,
    intel,
    selected,
    horizonId: horizon,
  });

  const livePrice = selected?.market.price;
  const priceLabel =
    livePrice != null && livePrice > 0 ? `$${formatGatePrice(livePrice)}` : "DATA UNAVAILABLE";
  const live24h = selected?.market.change24h;
  const cmcLive = selected?.cmcLive ?? false;

  const constitutionActive =
    intel?.constitution.filter((a) => a.status === "active").length ??
    truth.checksPassed ??
    0;
  const constitutionTotal = intel?.constitution.length ?? 6;
  const constitutionViolated = intel?.constitution.filter((a) => a.status === "violated").length ?? 0;

  const narrativeLeader =
    intel?.narrativeFlow.likelyNextLeader.narrative ?? intel?.genome.narrative ?? "—";
  const migration = intel?.narrativeFlow.migration[0];

  const heroSurface =
    truth.displayDirection === "ACCUMULATE" || truth.displayDirection === "HOLD POSITION"
      ? "border-emerald-400/25 bg-emerald-500/[0.06]"
      : truth.displayDirection === "EXIT" || truth.displayDirection === "REDUCE"
        ? "border-rose-400/25 bg-rose-500/[0.06]"
        : "border-slate-400/20 bg-slate-500/[0.05]";

  return (
    <div className="gate-v2-stack space-y-6">
      {/* Section 1 — Horizon-driven hero (live CMC) + execution router */}
      <section className={cn("rounded-2xl border px-6 py-7 sm:px-8 sm:py-8", heroSurface)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="gate-verdict-label">
            {GATE_SYMBOL_LABELS[symUpper as keyof typeof GATE_SYMBOL_LABELS] ?? symUpper}
            {cmcLive ? " · CMC live" : " · DATA UNAVAILABLE"}
            {intelPending ? " · syncing…" : ""}
          </p>
          {intel?.directionEvidence ? (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
              Data quality {intel.directionEvidence.dataQualityScore}%
            </span>
          ) : null}
        </div>

        <p className="mt-6 text-sm font-medium uppercase tracking-[0.14em] text-white/55">{truth.deskLabel}</p>
        <p className={cn("mt-1 text-5xl font-semibold tracking-tight", spotStateTone(truth.displayDirection))}>
          {truth.displayDirection}
        </p>
        <p className={cn("mt-2 text-lg font-medium", verdictTierTone(truth.verdictTier))}>{truth.verdictTier}</p>
        <p className="gate-body-text mt-3 max-w-3xl">{truth.summary}</p>
        <p className="gate-meta-text mt-2 text-white/45">{truth.reviewLabel}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <GateStatPill label="Permit" value={truth.permit} sub="Strategy gate · entry rules" />
          <GateStatPill label="Risk regime" value={truth.riskRegime} sub={`F&G ${intel?.genome.fearGreed ?? selected?.market.fearGreed ?? "—"}`} />
          <GateStatPill
            label="Constitution"
            value={truth.checksPassed != null && truth.checksTotal != null ? `${truth.checksPassed}/${truth.checksTotal}` : "—"}
            sub={truth.tier ? `Tier ${truth.tier}` : "Checks"}
          />
          <GateStatPill label="Conviction" value={String(truth.conviction)} sub={truth.convictionBand} />
          <GateStatPill
            label="Price"
            value={priceLabel}
            sub={live24h != null ? `24h ${formatPct(live24h)}` : "—"}
          />
        </div>

        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Desk state by horizon · live CMC — windows may disagree
        </p>
        <GateHorizonAllWindows
          evidence={intel?.directionEvidence}
          market={marketCtx}
          active={horizon}
          onSelect={setHorizon}
          loading={intelPending}
        />

        <p className="gate-meta-text mt-4">Updated {formatUpdated(truth.updatedAt)}</p>
      </section>

      {/* Section 2 — Four pillars */}
      <GateCollapsibleCard
        title="Four pillars"
        question="What drives this read?"
        summary={
          <span>
            {truth.pillars.map((p) => `${p.label} ${p.value}`).join(" · ")}
          </span>
        }
        icon={Scale}
        defaultOpen={false}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {truth.pillars.map((p) => (
            <GateStatPill key={p.id} label={p.label} value={p.value} sub={p.detail} />
          ))}
        </div>
      </GateCollapsibleCard>

      {/* Section 3 — Thesis */}
      <GateCollapsibleCard
        title="Thesis"
        question="Why should I care?"
        summary={<p className="line-clamp-2">{intel?.explainability.why ?? truth.summary}</p>}
        icon={Scale}
        defaultOpen={false}
      >
        <div className="gate-body-text space-y-3">
          <p>{intel?.explainability.why ?? truth.summary}</p>
          {intel?.explainability.whyNow && (
            <p>
              <span className="text-white/50">Why now — </span>
              {intel.explainability.whyNow}
            </p>
          )}
          {intel?.explainability.thesisBreakers.length ? (
            <p>
              <span className="text-white/50">Invalidates if — </span>
              {intel.explainability.thesisBreakers.slice(0, 2).join("; ")}
            </p>
          ) : null}
          {intel?.explainability.whoDisagrees.length ? (
            <p>
              <span className="text-white/50">Blocks — </span>
              {intel.explainability.whoDisagrees.slice(0, 2).join("; ")}
            </p>
          ) : null}
          <p className="text-white/45">{truth.reviewLabel}</p>
        </div>
        <div className="mt-4">
          <GateSectionLink onClick={() => onGoTab("technical")} features={getGateDeskTabMeta("technical").features.slice(0, 3)}>
            Full debate and layer evidence
          </GateSectionLink>
        </div>
      </GateCollapsibleCard>

      {/* Section 4 — Bull vs Bear Court */}
      <GateCollapsibleCard
        title="Bull vs Bear Court"
        question="Who disagrees?"
        summary={
          truth.courtSummary
            ? `Bull ${truth.courtSummary.bullScore} · Bear ${truth.courtSummary.bearScore} · Conflict ${truth.courtSummary.conflict} · ${truth.courtSummary.verdict}`
            : "Court convenes when intelligence syncs"
        }
        icon={Users}
        defaultOpen={false}
      >
        {truth.courtSummary ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <GateStatPill label="Bull score" value={String(truth.courtSummary.bullScore)} sub="Evidence for exposure" />
              <GateStatPill label="Bear score" value={String(truth.courtSummary.bearScore)} sub="Evidence to de-risk" />
              <GateStatPill label="Hold weight" value={String(truth.courtSummary.holdScore)} sub="Neutral / abstain" />
              <GateStatPill
                label="Verdict"
                value={truth.courtSummary.verdict}
                sub={`Conflict ${truth.courtSummary.conflict} · spread ${truth.courtSummary.spread}`}
              />
            </div>
            <p className="gate-body-text text-white/55">{truth.courtSummary.note}</p>
          </div>
        ) : (
          <p className="gate-body-text text-white/45">Awaiting intelligence sync for court scores.</p>
        )}
        <div className="mt-4">
          <GateSectionLink onClick={() => onGoTab("technical")} features={["Chamber debate", "Layer evidence", "Conflict map"]}>
            Full technical debate
          </GateSectionLink>
        </div>
      </GateCollapsibleCard>

      {/* Section 5 — Constitution summary (bias ≠ permission) */}
      <GateCollapsibleCard
        title="Constitution summary"
        question="How does the gate judge?"
        summary={
          <span>
            {truth.tier ? `Tier ${truth.tier} · ` : ""}
            {truth.checksPassed != null && truth.checksTotal != null
              ? `${truth.checksPassed}/${truth.checksTotal} checks · `
              : ""}
            {truth.constitutionBias} · permit {truth.permit}
          </span>
        }
        icon={Shield}
        defaultOpen={false}
      >
        <p className="gate-body-text mb-3 text-white/55">
          Constitution bias explains layer alignment — it is not the final signal. Router verdict:{" "}
          <span className="font-medium text-white">{truth.displayDirection}</span>.
        </p>
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
        <p className="gate-meta-text mt-3">
          {constitutionActive}/{constitutionTotal} articles active
          {constitutionViolated > 0 ? ` · ${constitutionViolated} violated` : ""}
        </p>
        <div className="mt-4">
          <GateSectionLink onClick={() => onGoTab("rules")} features={getGateDeskTabMeta("rules").features.slice(0, 3)}>
            Full rules and weightings
          </GateSectionLink>
        </div>
      </GateCollapsibleCard>

      {/* Section 5 — Narrative summary */}
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
              <div
                className="h-full rounded-full bg-violet-500/50"
                style={{ width: `${n.strength != null ? n.strength : 0}%` }}
              />
            </div>
            <span className="w-8 text-right tabular-nums text-white/40">
              {n.strength != null ? n.strength : "—"}
            </span>
          </div>
        )) ?? <p className="gate-body-text text-white/45">Narrative radar syncs with intelligence.</p>}
      </GateCollapsibleCard>

      {/* Section 6 — Market memory (compact) */}
      <GateCollapsibleCard
        title="Market memory"
        question="Have we seen this before?"
        summary={
          intel
            ? `Ref ${intel.marketTwin.referenceLabel} (${intel.marketTwin.similarity}%) · decay ${intel.convictionDecay.current} → review ${intel.convictionDecay.reviewAfterHours}h`
            : "Twin and decay sync with intelligence"
        }
        icon={Brain}
        defaultOpen={false}
      >
        {intel ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="mb-1 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90 sm:col-span-2">
              Reference library only — historical episode match, not a live CMC forecast or router verdict.
            </p>
            <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
              <p className="gate-stat-label">Market Twin</p>
              <p className="mt-1 text-sm font-medium text-white">{intel.marketTwin.referenceLabel}</p>
              <p className="gate-meta-text mt-1">
                {intel.marketTwin.similarity}% similarity · {intel.marketTwin.confidence} · episode {intel.marketTwin.period}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
              <p className="gate-stat-label">Trade DNA</p>
              <p className="mt-1 text-sm text-white/80">
                {intel.thesisDna.regime} · {intel.thesisDna.momentum} momentum
              </p>
              <p className="gate-meta-text mt-1">{intel.thesisDna.narrative}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 sm:col-span-2">
              <p className="gate-stat-label">Conviction decay</p>
              <p className="mt-1 text-sm text-white/80">
                {intel.convictionDecay.current} now → {intel.convictionDecay.curve.at(-1)?.value ?? "—"} at review ·{" "}
                {intel.convictionDecay.status}
              </p>
              <p className="gate-meta-text mt-1">Review horizon {intel.convictionDecay.reviewAfterHours}h</p>
            </div>
          </div>
        ) : (
          <p className="gate-body-text text-white/45">Memory layer loads with intelligence API.</p>
        )}
        <div className="mt-4">
          <GateSectionLink onClick={() => onGoTab("memory")} features={getGateDeskTabMeta("memory").features.slice(0, 3)}>
            Full memory and autopsy
          </GateSectionLink>
        </div>
      </GateCollapsibleCard>

      {/* Section 7 — Reproduce this verdict (same engine everywhere) */}
      <GateCollapsibleCard
        title="Reproduce this verdict"
        question="Can a judge verify it?"
        summary={
          <span className="font-mono text-[11px]">
            {formatSpecHash()} · skill v{SKILL_VERSION} · curl /api/gate/evaluate?symbol={symUpper}
          </span>
        }
        icon={Terminal}
        defaultOpen={false}
      >
        <p className="gate-body-text mb-3 text-white/55">
          The same deterministic engine powers this desk, the REST API, the CLI backtest, and the
          90-day replay. Run it yourself — no login, no key for the skills view.
        </p>
        <ul className="space-y-2 font-mono text-[11px] text-white/60">
          <li className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2">
            curl {MERIDIAN_PROD_URL}/api/gate/evaluate?symbol={symUpper}
          </li>
          <li className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2">
            curl {MERIDIAN_PROD_URL}/api/gate/skills?symbol={symUpper}
          </li>
          <li className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2">
            npm run bnb:backtest -- --symbol {symUpper} --days 90
          </li>
        </ul>
        <p className="gate-meta-text mt-3">
          Spec identity {formatSpecHash()} · {GATE_SYMBOL_LABELS[symUpper as keyof typeof GATE_SYMBOL_LABELS] ?? symUpper} ·
          live CMC → 8 skills → court → constitution → replay
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <a
            href={GATE_SKILL_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-300 hover:underline"
          >
            SKILL.md + STRATEGY_SPEC ↗
          </a>
          <GateSectionLink onClick={() => onGoTab("replay")} features={["Same rules", "90-day proof", "Equity curve"]}>
            Open 90-day replay
          </GateSectionLink>
        </div>
      </GateCollapsibleCard>

      {/* Section 8 — Primary action (aligned with router) */}
      <GateOverviewExecutionPath
        symbol={symbol}
        selected={selected}
        skills={skills}
        positionRoute={positionRoute}
        directionLoading={directionLoading}
        gateRoute={gateRoute}
        benchmarks={benchmarks}
        permit={permit ?? truth.permit}
        permitId={permitId}
        priceUsd={livePrice}
        arbitration={arbitration}
        primaryAction={truth.primaryAction}
        routerDirection={truth.executionDirection}
        deskLabel={truth.deskLabel}
        track2Priority={track2Priority}
        onOpenNexus={onOpenNexus}
        onOpenAutopilot={onOpenAutopilot}
        onGoRules={() => onGoTab("rules")}
      />

      {intelPending && (
        <p className="text-center text-xs text-white/40">Refreshing intelligence for {symUpper}…</p>
      )}
    </div>
  );
}
