"use client";

import Link from "next/link";
import { BookOpen, ExternalLink, Terminal } from "lucide-react";
import { GATE_SKILL_REPO } from "@/lib/gate-constants";
import { GateDataProvenance } from "@/components/gate/gate-data-provenance";
import type { GateBenchmarkFull } from "@/lib/gate-route-types";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import { extractJudgeConsensus } from "@/lib/gate-consensus-payload";
import { formatSpecHash, relativeTime, SKILL_VERSION } from "@/lib/meridian-math";
import { MERIDIAN_PROD_URL } from "@/lib/meridian-brand";
import { cn } from "@/lib/utils";

export function GateCmcSkillStrip({
  selected,
  cmcLive,
  skills,
}: {
  selected: GateBenchmarkFull;
  cmcLive?: boolean;
  skills?: GateSkillsPayload | null;
}) {
  const sym = selected.symbol;
  const skillsApi = `/api/gate/skills?symbol=${sym}`;
  const backtestApi = `/api/gate/backtest?symbol=${sym}&days=90`;
  const evaluateApi = `/api/gate/evaluate?symbol=${sym}`;
  const consensus = extractJudgeConsensus(skills ?? (selected.skills as GateSkillsPayload | undefined));
  const oracleUpdated = selected.oracle?.updatedAt;
  const lastSync =
    typeof oracleUpdated === "number"
      ? relativeTime(new Date(oracleUpdated).toISOString())
      : cmcLive
        ? "live"
        : "—";

  return (
    <section className="rounded-2xl border border-violet-400/20 bg-violet-950/20 overflow-hidden">
      {/* Evidence ledger — Stripe-style receipt: one engine, sourced + timestamped. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/8 bg-black/30 px-4 py-2 font-mono text-[10px] text-white/55 sm:px-5">
        <span className="font-semibold uppercase tracking-[0.18em] text-violet-200/80">Evidence ledger</span>
        <span className={cn(cmcLive ? "text-emerald-300" : "text-amber-300")}>
          CMC {cmcLive ? "live" : "cached"}
        </span>
        <span aria-hidden className="text-white/20">·</span>
        <span>sync {lastSync}</span>
        <span aria-hidden className="text-white/20">·</span>
        <span>skill v{SKILL_VERSION}</span>
        <span aria-hidden className="text-white/20">·</span>
        <span className="text-cyan-200/80">{formatSpecHash()}</span>
        <span aria-hidden className="text-white/20">·</span>
        <span>last eval {sym}</span>
      </div>
      <div className="border-b border-white/8 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/85">
              CMC strategy skill · judge path
            </p>
            <h3 className="mt-1 text-base font-semibold text-white">
              {sym} — live CoinMarketCap → 8 deterministic skills → backtest
            </h3>
            <p className="mt-1 text-xs text-white/55">
              Momentum · Sentiment · Regime · Trend · Liquidity · Structure · RS vs BNB · Volatility → weighted consensus
              (55% long · 4/9 layers · 2/4 core stack).
            </p>
            {consensus && (
              <p className="mt-2 font-mono text-[10px] text-cyan-200/80">
                consensus.deskSignal={consensus.deskSignal} · permit={consensus.permit.status} ·{" "}
                {consensus.weights.longPct}/{consensus.weights.holdPct}/{consensus.weights.bearPct} L/H/B
              </p>
            )}
          </div>
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase",
              cmcLive ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200" : "border-amber-400/30 bg-amber-500/10 text-amber-200",
            )}
          >
            CMC {cmcLive ? "live" : "cached"}
          </span>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        <GateDataProvenance sources={selected.fieldSources} oracle={selected.oracle ?? null} />

        <div className="rounded-xl border border-white/10 bg-black/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Reproduce</p>
          <ul className="mt-2 space-y-2 text-[11px]">
            <li>
              <a
                href={GATE_SKILL_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-cyan-300 hover:underline"
              >
                <BookOpen className="h-3.5 w-3.5" /> SKILL.md + STRATEGY_SPEC
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </li>
            <li>
              <a href={skillsApi} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-cyan-300 hover:underline">
                <Terminal className="h-3.5 w-3.5" /> GET {skillsApi} · includes consensus block
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </li>
            <li>
              <Link href={`/gate?tab=replay`} className="text-violet-200 hover:underline">
                90-day replay tab · same rules as CLI backtest
              </Link>
            </li>
            <li className="font-mono text-[10px] text-white/40">
              npm run bnb:backtest -- --symbol {sym} --days 90
            </li>
            <li className="font-mono text-[10px] text-white/35">{backtestApi}</li>
            <li className="font-mono text-[10px] text-white/30">
              curl {MERIDIAN_PROD_URL}{evaluateApi}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
