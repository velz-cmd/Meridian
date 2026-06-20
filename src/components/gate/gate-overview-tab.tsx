"use client";

import { Brain, GitBranch, Scale, Shield, Users } from "lucide-react";
import { GateHorizonContext } from "@/components/gate/gate-horizon-context";
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

  const truth = resolveGateOverviewTruth({
    positionRoute,
    judgeConsensus,
    intel,
    selected,
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

  const court = intel?.bullBearCourt;
  const holdScore = judgeConsensus?.weights.holdPct ?? (court ? 100 - court.bull.score - court.bear.score : null);

  const narrativeLeader =
    intel?.narrativeFlow.likelyNextLeader.narrative ?? intel?.genome.narrative ?? "—";
  const migration = intel?.narrativeFlow.migration[0];

  const heroSurface =
    truth.direction === "LONG"
      ? "border-emerald-400/25 bg-emerald-500/[0.06]"
      : truth.direction === "SHORT"
        ? "border-rose-400/25 bg-rose-500/[0.06]"
        : "border-slate-400/20 bg-slate-500/[0.05]";

  return (
    <div className="gate-v2-stack space-y-6">
      {/* Section 1 — Executive hero: ONE router truth only */}
      <section className={cn("rounded-2xl border px-6 py-7 sm:px-8 sm:py-8", heroSurface)}>
        <p className="gate-verdict-label">
          {GATE_SYMBOL_LABELS[symUpper as keyof typeof GATE_SYMBOL_LABELS] ?? symUpper}
          {cmcLive ? " · CMC live" : " · DATA UNAVAILABLE"}
          {intelPending ? " · syncing…" : ""}
        </p>
        <p className="mt-3 text-sm font-medium uppercase tracking-[0.14em] text-white/55">{truth.deskLabel}</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight text-white">{truth.displayDirection}</p>
        <p className="gate-body-text mt-4 max-w-2xl">{truth.summary}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <GateStatPill label="Permit" value={truth.permit} sub="Execution gate · not bias" />
          <GateStatPill label="Risk regime" value={truth.riskRegime} sub={`F&G ${intel?.genome.fearGreed ?? selected?.market.fearGreed ?? "—"}`} />
          <GateStatPill label="Conviction" value={String(truth.conviction)} sub="Router confidence" />
          <GateStatPill label="Horizon" value={`${truth.horizonHours}h`} sub={`Thesis ${intel?.convictionDecay.status ?? "—"}`} />
          <GateStatPill
            label="Price"
            value={priceLabel}
            sub={live24h != null ? `24h ${formatPct(live24h)}` : "—"}
          />
        </div>
        <p className="gate-meta-text mt-4">Updated {formatUpdated(truth.updatedAt)}</p>
      </section>

      <GateHorizonContext
        evidence={intel?.directionEvidence}
        loading={intelPending}
        defaultHorizon={
          intel?.directionEvidence?.timeHorizonBucket === "intraday"
            ? "intraday"
            : intel?.directionEvidence?.timeHorizonBucket === "position"
              ? "position"
              : intel?.directionEvidence?.timeHorizonBucket === "scalping"
                ? "scalping"
                : "swing"
        }
      />

      {/* Section 2 — Thesis */}
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
          <p className="text-white/45">
            Review after {intel?.explainability.validityHours ?? truth.horizonHours}h.
          </p>
        </div>
        <div className="mt-4">
          <GateSectionLink onClick={() => onGoTab("technical")} features={getGateDeskTabMeta("technical").features.slice(0, 3)}>
            Full debate and layer evidence
          </GateSectionLink>
        </div>
      </GateCollapsibleCard>

      {/* Section 3 — Bull vs Bear Court */}
      <GateCollapsibleCard
        title="Bull vs Bear Court"
        question="Who disagrees?"
        summary={
          court
            ? `Bull ${court.bull.score} · Bear ${court.bear.score}${holdScore != null ? ` · Hold ${Math.round(holdScore)}` : ""} · spread ${court.spread}`
            : "Court convenes when intelligence syncs"
        }
        icon={Users}
        defaultOpen={false}
      >
        {court ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <GateStatPill label="Bull score" value={String(court.bull.score)} sub="Evidence for exposure" />
              <GateStatPill label="Bear score" value={String(court.bear.score)} sub="Evidence to de-risk" />
              <GateStatPill
                label="Hold / spread"
                value={holdScore != null ? String(Math.round(holdScore)) : "—"}
                sub={`Spread ${court.spread} · ${court.verdict}`}
              />
            </div>
            <p className="gate-body-text text-white/55">{court.conflictNote}</p>
            {court.dissent.length > 0 && (
              <ul className="space-y-1 text-xs text-white/45">
                {court.dissent.slice(0, 3).map((d) => (
                  <li key={d}>· {d}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="gate-body-text text-white/45">Awaiting intelligence sync for court scores.</p>
        )}
        <div className="mt-4">
          <GateSectionLink onClick={() => onGoTab("technical")} features={["Bull Court", "Bear Court", "Layer votes"]}>
            Full chamber debate
          </GateSectionLink>
        </div>
      </GateCollapsibleCard>

      {/* Section 4 — Constitution summary (bias ≠ permission) */}
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

      {/* Section 7 — Primary action (aligned with router) */}
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
        routerDirection={truth.direction}
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
