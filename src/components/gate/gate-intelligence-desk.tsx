"use client";

import {
  Brain,
  Clock,
  Dna,
  GitBranch,
  Loader2,
  Scale,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { MeridianIntelligencePayload } from "@/lib/meridian-intelligence-types";
import { cn } from "@/lib/utils";

function Card({
  title,
  icon: Icon,
  children,
  accent = "border-white/10",
}: {
  title: string;
  icon: typeof Brain;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section className={cn("rounded-2xl border bg-black/30 p-4", accent)}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-violet-300" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function StatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2">
      <p className="text-[9px] uppercase tracking-wider text-white/35">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-white">{value}</p>
      {sub && <p className="text-[10px] text-white/45">{sub}</p>}
    </div>
  );
}

export function GateIntelligenceDesk({
  data,
  loading,
  error,
  onReload,
}: {
  data: MeridianIntelligencePayload | null;
  loading: boolean;
  error: string | null;
  onReload?: () => void;
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

  const { genome, marketTwin, bullBearCourt, narrativeFlow, timeMachine, thesisDna, convictionDecay, counterfactuals, constitution, marketMemory, evolution } = data;
  const maxDecay = Math.max(1, ...convictionDecay.curve.map((c) => c.value));

  return (
    <div className="space-y-4">
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
                {data.architecture.breadthPct}% · {data.architecture.featuresLive} features live
              </p>
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
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <StatPill label="Regime" value={genome.regime} sub={`F&G ${genome.fearGreed}`} />
          <StatPill label="Breadth" value={`${genome.breadth}%`} sub={`Narrative · ${genome.narrative}`} />
          <StatPill label="Conviction" value={String(convictionDecay.current)} sub={`Thesis ${convictionDecay.status}`} />
          <StatPill label="Market twin" value={`${marketTwin.similarity}%`} sub={marketTwin.period} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Market Twin" icon={TrendingUp} accent="border-cyan-400/20">
          <p className="mb-2 font-mono text-[8px] uppercase text-violet-300/60">MERIDIAN · historical analog</p>
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
          <div className="mt-3 flex flex-wrap gap-2">
            {marketTwin.outcomes.map((o) => (
              <span key={o.symbol} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 font-mono text-[10px]">
                {o.symbol} +{o.returnPct}%
              </span>
            ))}
          </div>
        </Card>

        <Card title="Bull vs Bear Court" icon={Scale} accent="border-amber-400/20">
          <p className="mb-2 font-mono text-[8px] uppercase text-amber-300/60">MERIDIAN · 9 CMC skill layers as attorneys</p>
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
            Verdict: <span className="text-amber-200">{bullBearCourt.verdict}</span> · Permit {bullBearCourt.permit}
          </p>
          {bullBearCourt.dissent.length > 0 && (
            <p className="mt-1 text-[11px] text-amber-200/80">Dissent: {bullBearCourt.dissent.join(" · ")}</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Narrative Flow" icon={GitBranch}>
          <p className="mb-2 font-mono text-[8px] uppercase text-cyan-300/60">CMC + MERIDIAN · category rotation</p>
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
            Likely leader: {narrativeFlow.likelyNextLeader.narrative} ({narrativeFlow.likelyNextLeader.confidence}%)
          </p>
        </Card>

        <Card title="Conviction Decay" icon={Clock}>
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
        </Card>

        <Card title="Thesis DNA" icon={Dna}>
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
        </Card>
      </div>

      {timeMachine && (
        <Card title="Time Machine · forward analog" icon={Sparkles} accent="border-emerald-400/15">
          <div className="grid gap-2 sm:grid-cols-4">
            <StatPill label="Avg return" value={`+${timeMachine.avgReturnPct}%`} />
            <StatPill label="Win rate" value={`${timeMachine.winRatePct}%`} />
            <StatPill label="Duration" value={`${timeMachine.avgDurationDays}d`} />
            <StatPill label="Worst DD" value={`${timeMachine.worstDrawdownPct}%`} sub={timeMachine.source} />
          </div>
        </Card>
      )}

      <Card title="Counterfactual Universe" icon={Zap}>
        <div className="grid gap-2 sm:grid-cols-2">
          {counterfactuals.map((c) => (
            <div key={c.scenario} className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2 text-xs">
              <p className="font-medium text-white/80">{c.scenario}</p>
              <p className="mt-1 font-mono text-[11px]">
                <span className="text-white/50">{c.convictionBefore}</span>
                {" → "}
                <span className={c.delta >= 0 ? "text-emerald-300" : "text-rose-300"}>{c.convictionAfter}</span>
                <span className="text-white/40"> ({c.delta >= 0 ? "+" : ""}{c.delta})</span>
              </p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Market Constitution" icon={Scale}>
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
        </Card>

        <Card title="Market Memory" icon={Brain}>
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
        </Card>
      </div>

      <details className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
        <summary className="cursor-pointer text-xs font-semibold text-white/60">10 questions MERIDIAN answers</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] text-white/45">
          {data.philosophy.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </details>
    </div>
  );
}
