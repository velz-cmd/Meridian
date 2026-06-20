"use client";

import {
  Brain,
  Clock,
  Dna,
  GitBranch,
  Loader2,
  Scale,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { MeridianIntelligencePayload } from "@/lib/meridian-intelligence-types";
import { GateMarketTimeline } from "@/components/gate/gate-market-timeline";
import { GateTradeJournalPanel } from "@/components/gate/gate-trade-journal-panel";
import { GateSectionCard } from "@/components/gate/gate-section-head";
import { formatSignedPct } from "@/lib/gate-format";
import { cn } from "@/lib/utils";

function StatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="gate-stat-pill rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2">
      <p className="gate-stat-label">{label}</p>
      <p className="gate-stat-value mt-0.5 text-lg">{value}</p>
      {sub && <p className="gate-stat-sub">{sub}</p>}
    </div>
  );
}

export type IntelligenceDeskView = "memory" | "technical" | "rules" | "replay" | "full";

function shows(view: IntelligenceDeskView, ...allowed: IntelligenceDeskView[]) {
  return view === "full" || allowed.includes(view);
}

const VIEW_LABELS: Record<Exclude<IntelligenceDeskView, "full">, string> = {
  memory: "Market Memory",
  technical: "Technical & Reasoning",
  rules: "Rules & Spec",
  replay: "90-Day Replay",
};

export function GateIntelligenceDesk({
  data,
  loading,
  error,
  onReload,
  view = "full",
}: {
  data: MeridianIntelligencePayload | null;
  loading: boolean;
  error: string | null;
  onReload?: () => void;
  view?: IntelligenceDeskView;
}) {
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/5 py-16 text-sm text-white/60">
        <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
        Loading Market Memory Engine…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-6 text-sm text-rose-100">
        {error}
        {onReload && (
          <button type="button" className="ml-2 underline" onClick={onReload}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!data) return null;

  const {
    genome,
    marketTwin,
    bullBearCourt,
    narrativeFlow,
    timeMachine,
    thesisDna,
    convictionDecay,
    counterfactuals,
    constitution,
    marketMemory,
    evolution,
    verdict,
    verdictReason,
    confidence,
    explainability,
    provenance,
    skillEvidence,
    tradeAutopsy,
    tradeJournal,
    truth,
  } = data;
  const maxDecay = Math.max(1, ...convictionDecay.curve.map((c) => c.value));

  const verdictColor =
    verdict === "GRANT"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
      : verdict === "DENY"
        ? "border-rose-400/40 bg-rose-500/10 text-rose-100"
        : verdict === "WAIT"
          ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
          : "border-white/20 bg-white/5 text-white/70";

  return (
    <div className="space-y-4">
      {view !== "full" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-400/20 bg-violet-950/30 px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300/90">
              MERIDIAN · {VIEW_LABELS[view]}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              {data.symbol} · {genome.id}
            </p>
          </div>
          {onReload && (
            <button
              type="button"
              onClick={onReload}
              className="rounded-lg border border-white/12 px-3 py-1.5 text-xs text-white/70 hover:border-violet-400/40"
            >
              Refresh
            </button>
          )}
        </div>
      )}

      {shows(view, "full") && (
        <div className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-950/40 to-black/40 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300/90">
                MERIDIAN · Market Memory Engine
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                {data.symbol} intelligence · <span className="text-white/50">{genome.id}</span>
              </h2>
              <p className="mt-2 max-w-2xl text-xs text-white/55">
                CMC skills → Bull/Bear Court → Memory & stress. Not “what to buy” — why, who disagrees, what breaks it.
              </p>
              {data.architecture && (
                <p className="mt-1 font-mono text-[10px] text-cyan-300/70">
                  {data.architecture.tagline} · {data.architecture.cmcSkillCount} CMC skills · breadth{" "}
                  {data.architecture.breadthPct ?? "UNKNOWN"} · {data.architecture.featuresLive} features live
                </p>
              )}
              <p className="mt-2 font-mono text-[10px] text-white/40">
                Source: {provenance.source} · updated {provenance.freshnessLabel} · completeness{" "}
                {provenance.dataCompletenessPct}% · quality {provenance.dataQuality}
                {provenance.cmcLive ? " · CMC live" : " · venue/cached"}
              </p>
              <p className="mt-1 text-[10px] text-white/40">
                {truth.dataIntegrity.replace(/-/g, " ")} · cosmetic intelligence forbidden
              </p>
              {provenance.staleWarning && (
                <p className="mt-1 text-[10px] text-amber-300/90">{provenance.staleWarning}</p>
              )}
            </div>
            {onReload && (
              <button
                type="button"
                onClick={onReload}
                className="rounded-lg border border-white/12 px-3 py-1.5 text-xs text-white/70 hover:border-violet-400/40"
              >
                Refresh
              </button>
            )}
          </div>
          <div className={cn("mt-4 rounded-xl border px-4 py-3", verdictColor)}>
            <p className="font-mono text-[10px] uppercase tracking-wider opacity-80">Final verdict · evidence engine</p>
            <p className="mt-1 text-lg font-bold">{verdict}</p>
            <p className="mt-1 text-xs opacity-90">{verdictReason}</p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <StatPill label="Regime" value={genome.regime} sub={`F&G ${genome.fearGreed ?? "UNKNOWN"}`} />
            <StatPill label="Breadth" value={genome.breadth != null ? `${genome.breadth}%` : "UNKNOWN"} sub={genome.breadthLabel} />
            <StatPill label="Conviction" value={String(confidence.conviction)} sub={`Thesis ${convictionDecay.status}`} />
            <StatPill label="Twin similarity" value={`${confidence.historicalSimilarity}%`} sub={marketTwin.period} />
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <StatPill label="Bull–Bear spread" value={String(confidence.bullBearSpread)} sub="Not probability" />
            <StatPill label="Data completeness" value={`${confidence.dataCompletenessPct}%`} sub={confidence.note} />
            <StatPill label="Net court conviction" value={String(bullBearCourt.netConviction)} sub={bullBearCourt.conflictNote} />
          </div>
        </div>
      )}

      {shows(view, "memory", "full") && (
        <GateSectionCard title="Market Twin" question="Have we seen this episode before?" kicker="MERIDIAN · historical analog" icon={TrendingUp} accent="border-cyan-400/20">
          <p className="text-sm text-cyan-100">
            Resembles <span className="font-semibold">{marketTwin.label}</span> · {marketTwin.similarity}% similar ·{" "}
            {marketTwin.confidence} confidence
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-white/55">
            {marketTwin.differences.map((d) => (
              <li key={d}>· {d}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-white/70">{marketTwin.implication}</p>
          <p className="mt-2 text-[10px] italic text-white/40">{marketTwin.disclaimer}</p>
          <p className="mt-2 text-xs text-white/55">
            Analog episode avg {formatSignedPct(marketTwin.avgHistoricalReturnPct)} · worst episode{" "}
            {formatSignedPct(marketTwin.worstHistoricalReturnPct)} · reference library n={marketTwin.sampleSize}
          </p>
          <p className="mt-1 text-[10px] text-amber-200/75">
            Historical analog only — not the 90-day strategy backtest on Replay tab.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {marketTwin.outcomes.map((o) => (
              <span key={o.symbol} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 font-mono text-[10px]">
                {o.symbol} {formatSignedPct(o.returnPct)}
              </span>
            ))}
          </div>
        </GateSectionCard>
      )}

      {shows(view, "technical", "full") && (
        <GateSectionCard title="Bull vs Bear Court" question="Who disagrees?" kicker="MERIDIAN · 9 CMC skill layers as attorneys" icon={Scale} accent="border-amber-400/20">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
              <p className="text-[10px] uppercase text-emerald-300">Bull Attorney</p>
              <p className="text-2xl font-bold text-emerald-200">{bullBearCourt.bull.score}</p>
              <ul className="mt-2 space-y-1 text-[10px] text-white/55">
                {bullBearCourt.bull.arguments.slice(0, 4).map((a) => (
                  <li key={a}>+ {a}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3">
              <p className="text-[10px] uppercase text-rose-300">Bear Attorney</p>
              <p className="text-2xl font-bold text-rose-200">{bullBearCourt.bear.score}</p>
              <ul className="mt-2 space-y-1 text-[10px] text-white/55">
                {bullBearCourt.bear.arguments.slice(0, 4).map((a) => (
                  <li key={a}>− {a}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-white">
            Verdict: <span className="text-amber-200">{bullBearCourt.verdict}</span> · Net {bullBearCourt.netConviction}{" "}
            · Permit {bullBearCourt.permit}
          </p>
          <p className="mt-1 text-[10px] text-white/45">{bullBearCourt.conflictNote}</p>
          {bullBearCourt.dissent.length > 0 && (
            <p className="mt-1 text-[11px] text-amber-200/80">Dissent: {bullBearCourt.dissent.join(" · ")}</p>
          )}
        </GateSectionCard>
      )}

      {shows(view, "memory", "full") && (
        <div className={cn("grid gap-4", view === "full" ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
          <GateSectionCard title="Narrative Flow" question="Where is capital moving?" kicker="CMC + MERIDIAN · category rotation" icon={GitBranch}>
            <div className="space-y-2">
              {narrativeFlow.radar.slice(0, 6).map((n) => (
                <div key={n.id} className="flex items-center gap-2 text-xs">
                  <span className="w-12 font-mono text-white/60">{n.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-violet-500/70" style={{ width: `${n.strength}%` }} />
                  </div>
                  <span className="w-8 text-right tabular-nums text-white/45">{n.strength}</span>
                </div>
              ))}
            </div>
            {narrativeFlow.migration[0] && (
              <p className="mt-3 text-[11px] text-cyan-200/90">
                Capital migration: {narrativeFlow.migration[0].from} → {narrativeFlow.migration[0].to} · strength{" "}
                {narrativeFlow.migration[0].strength}
              </p>
            )}
            <p className="mt-1 text-[10px] text-white/45">
              Likely leader: {narrativeFlow.likelyNextLeader.narrative} (conviction {narrativeFlow.likelyNextLeader.conviction})
            </p>
          </GateSectionCard>

          <GateSectionCard title="Conviction Decay" question="How long is the thesis valid?" icon={Clock}>
            <p className="text-2xl font-bold tabular-nums text-white">{convictionDecay.current}</p>
            <p className="text-[10px] text-white/45">Review after {convictionDecay.reviewAfterHours}h · {convictionDecay.status}</p>
            <div className="mt-3 flex h-20 items-end gap-2">
              {convictionDecay.curve.map((c) => (
                <div key={c.hours} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-amber-500/50"
                    style={{ height: `${Math.max(8, (c.value / maxDecay) * 100)}%` }}
                    title={`${c.label}: ${c.value}`}
                  />
                  <span className="text-[8px] text-white/35">{c.label}</span>
                </div>
              ))}
            </div>
          </GateSectionCard>

          {shows(view, "memory", "full") && (
            <GateSectionCard title="Thesis DNA" question="What fingerprint defines this setup?" icon={Dna}>
              <dl className="space-y-1.5 text-[11px]">
                <div className="flex justify-between"><dt className="text-white/45">ID</dt><dd className="font-mono text-violet-200">{thesisDna.id}</dd></div>
                <div className="flex justify-between"><dt className="text-white/45">Momentum</dt><dd>{thesisDna.momentum}</dd></div>
                <div className="flex justify-between"><dt className="text-white/45">RS</dt><dd>{thesisDna.relativeStrength}</dd></div>
                <div className="flex justify-between"><dt className="text-white/45">Volatility</dt><dd>{thesisDna.volatility}</dd></div>
                <div className="flex justify-between"><dt className="text-white/45">Liquidity</dt><dd>{thesisDna.liquidity}</dd></div>
              </dl>
              {thesisDna.resemblanceNote && (
                <p className="mt-2 text-[10px] leading-snug text-amber-200/85">{thesisDna.resemblanceNote}</p>
              )}
            </GateSectionCard>
          )}
        </div>
      )}

      {shows(view, "technical", "full") && (
        <GateSectionCard title="Skill Evidence (8 calculators)" question="What do deterministic skills show?" icon={Shield} accent="border-cyan-400/15">
          <p className="mb-3 text-[10px] text-white/45">Skills provide evidence only — Constitution decides. No BUY/SELL from skills.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {skillEvidence.map((s) => (
              <div
                key={s.skill}
                className={cn(
                  "rounded-xl border px-3 py-2 text-[11px]",
                  s.dataUnavailable ? "border-amber-400/30 bg-amber-500/5" : "border-white/[0.06] bg-black/25",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white">{s.skill}</span>
                  <span className="font-mono text-cyan-200">{s.score}</span>
                </div>
                <p className="mt-0.5 font-mono text-[9px] text-white/40">
                  stance {s.stance} · conf {s.confidence} · {s.dataSource}
                  {s.dataUnavailable ? " · DATA UNAVAILABLE" : ""}
                </p>
                <ul className="mt-1 space-y-0.5 text-[10px] text-white/50">
                  {s.evidence.slice(0, 4).map((e) => (
                    <li key={e}>· {e}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </GateSectionCard>
      )}

      {shows(view, "technical", "full") && (
        <GateSectionCard title="Explainability" question="Why · who disagrees · what breaks it?" icon={Brain}>
          <dl className="space-y-2 text-[11px]">
            <div><dt className="text-white/40">Why</dt><dd className="text-white/80">{explainability.why}</dd></div>
            <div><dt className="text-white/40">Why now</dt><dd className="text-white/80">{explainability.whyNow}</dd></div>
            <div><dt className="text-white/40">Who disagrees</dt><dd className="text-amber-200/90">{explainability.whoDisagrees.length ? explainability.whoDisagrees.join(" · ") : "No active dissent"}</dd></div>
            <div><dt className="text-white/40">What breaks the thesis</dt><dd className="text-rose-200/80">{explainability.thesisBreakers.join(" · ")}</dd></div>
            <div><dt className="text-white/40">Validity</dt><dd>{explainability.validityHours}h review window</dd></div>
            <div><dt className="text-white/40">Seen before</dt><dd>{explainability.seenBefore}</dd></div>
          </dl>
        </GateSectionCard>
      )}

      {timeMachine && shows(view, "replay", "full") && (
        <GateSectionCard title="90-Day Strategy Backtest" question="How did this rule set perform on Chapel data?" kicker="Constitution replay · reproducible" icon={Sparkles} accent="border-emerald-400/15">
          <p className="mb-3 text-[11px] text-white/50">
            Strategy P&amp;L from live CMC bars — separate from Market Twin historical analogs on Memory tab.
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
            <StatPill label="Total return" value={formatSignedPct(timeMachine.avgReturnPct)} sub="90d constitution" />
            <StatPill label="Win rate" value={`${timeMachine.winRatePct}%`} />
            <StatPill label="Avg hold" value={`${timeMachine.avgDurationDays}d`} />
            <StatPill label="Max drawdown" value={formatSignedPct(timeMachine.worstDrawdownPct)} sub={timeMachine.source} />
          </div>
        </GateSectionCard>
      )}

      {shows(view, "replay", "full") && <GateMarketTimeline symbol={data.symbol} />}

      {shows(view, "replay", "full") && (
        <GateSectionCard title="Counterfactual Universe" question="What if conditions change?" icon={Zap}>
          <div className="grid gap-2 sm:grid-cols-2">
            {counterfactuals.map((c) => (
              <div key={c.scenario} className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2 text-xs">
                <p className="font-medium text-white/80">{c.scenario}</p>
                {c.status === "recompute_failed" ? (
                  <p className="mt-1 font-mono text-[11px] text-amber-300">Recompute failed — no synthetic delta</p>
                ) : (
                  <p className="mt-1 font-mono text-[11px]">
                    <span className="text-white/50">{c.convictionBefore}</span>
                    {" → "}
                    <span className={(c.delta ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}>{c.convictionAfter}</span>
                    <span className="text-white/40">
                      {" "}
                      ({(c.delta ?? 0) >= 0 ? "+" : ""}
                      {c.delta}) · {c.sensitivity} sensitivity
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </GateSectionCard>
      )}

      {shows(view, "memory", "full") && (
        <GateTradeJournalPanel
          journal={tradeJournal}
          autopsies={tradeAutopsy.filter((a) => a.symbol === data.symbol)}
        />
      )}

      {shows(view, "rules", "full") && (
        <GateSectionCard title="Market Constitution" question="How does MERIDIAN judge?" icon={Scale}>
          <ul className="space-y-2">
            {constitution.map((a) => (
              <li key={a.id} className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white">Article {a.id} · {a.title}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[9px] uppercase",
                      a.status === "active" && "bg-emerald-500/15 text-emerald-300",
                      a.status === "violated" && "bg-rose-500/15 text-rose-300",
                      a.status === "triggered" && "bg-amber-500/15 text-amber-300",
                    )}
                  >
                    {a.status}
                  </span>
                </div>
                <p className="mt-1 text-white/45">{a.rule}</p>
                <p className="mt-0.5 text-white/35">{a.detail}</p>
              </li>
            ))}
          </ul>
        </GateSectionCard>
      )}

      {shows(view, "memory", "full") && (
        <GateSectionCard title="Market Memory" question="Nearest genome relatives" icon={Brain}>
          <ul className="space-y-2">
            {marketMemory.map((m) => (
              <li key={m.genomeId} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs">
                <div>
                  <span className="font-mono text-violet-200">#{m.genomeId}</span>
                  <span className="ml-2 text-white/55">{m.label}</span>
                </div>
                <div className="text-right font-mono text-[10px] text-white/45">
                  {m.similarity}% · +{m.avgOutcomePct}% · {m.winRatePct}% WR
                </div>
              </li>
            ))}
          </ul>
          {evolution && (
            <div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/5 p-3 text-[11px]">
              <p className="font-semibold text-violet-200">Evolution Engine · Constitution #{evolution.constitutionId}</p>
              <p className="mt-1 text-white/55">WR {evolution.winRatePct}% · Sharpe {evolution.sharpe}</p>
              <p className="text-white/45">Weakness: {evolution.weakness}</p>
              <p className="text-emerald-200/80">→ {evolution.proposedMutation}</p>
              <p className="text-white/35">{evolution.expectedImprovement}</p>
            </div>
          )}
        </GateSectionCard>
      )}

      {shows(view, "rules", "full") && (
        <details className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
          <summary className="cursor-pointer text-xs font-semibold text-white/60">Data provenance · {provenance.source}</summary>
          <p className="mt-2 text-[11px] text-white/45">
            Updated {provenance.freshnessLabel} · completeness {provenance.dataCompletenessPct}% · quality {provenance.dataQuality}
            {provenance.cmcLive ? " · CMC live" : " · venue/cached"}
          </p>
          {provenance.staleWarning && <p className="mt-1 text-[10px] text-amber-300/90">{provenance.staleWarning}</p>}
          {data.architecture && (
            <p className="mt-2 font-mono text-[10px] text-cyan-300/70">
              {data.architecture.tagline} · {data.architecture.cmcSkillCount} CMC skills · breadth{" "}
              {data.architecture.breadthPct ?? "UNKNOWN"} · {data.architecture.featuresLive} features live
            </p>
          )}
        </details>
      )}

      {shows(view, "rules", "full") && (
        <details className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
          <summary className="cursor-pointer text-xs font-semibold text-white/60">Golden rules · explainability questions</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] text-white/45">
            {data.goldenRules?.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-[11px] text-white/45">
            {data.philosophy.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </details>
      )}

      {shows(view, "full") && (
        <details className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
          <summary className="cursor-pointer text-xs font-semibold text-white/60">Golden rules · explainability questions</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] text-white/45">
            {data.goldenRules?.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-[11px] text-white/45">
            {data.philosophy.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
