"use client";

import { Loader2, TrendingUp } from "lucide-react";
import { GATE_SYMBOLS, type GateSymbol } from "@/lib/gate-constants";
import { strategyPosition } from "@/lib/gate-strategy-copy";
import type { GateBenchmarkFull, GateRoutePayload } from "@/lib/gate-route-types";
import { cn } from "@/lib/utils";

/** Single live scan panel — rank, conviction, per-coin metrics (no duplicate token grids). */
export function GateBenchmarkDesk({
  route,
  benchmarks,
  loading,
  selected,
  onSelect,
  onDeploy,
}: {
  route: GateRoutePayload | null;
  benchmarks: GateBenchmarkFull[];
  loading?: boolean;
  selected: GateSymbol;
  onSelect: (sym: GateSymbol) => void;
  onDeploy?: (symbol: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-6 text-sm text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading live CMC scan (1 batched request)…
      </div>
    );
  }

  const ranked = route?.ranked ?? [];
  const rankBySym = Object.fromEntries(ranked.map((r) => [r.symbol, r]));
  const deploying = route && route.allocation.primary !== "FLAT";
  const primarySym = route?.allocation.primary;

  const longCount = benchmarks.filter((b) => strategyPosition(b.gate.signal) === "LONG").length;

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-950/35 via-black/50 to-black/60">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/15">
              <TrendingUp className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/90">
                Live benchmark scan · per-coin engine
              </p>
              <h2 className="text-lg font-semibold text-white">
                {deploying && route
                  ? `Deploy ${route.allocation.splitPrimaryPct}% ${primarySym}${route.allocation.secondary ? ` + ${route.allocation.splitSecondaryPct}% ${route.allocation.secondary}` : ""}`
                  : "Stay flat — no benchmark clears"}
              </h2>
              <p className="mt-1 text-xs text-white/50">
                {longCount} LONG · {benchmarks.length - longCount} FLAT
                {route ? ` · ${route.regime.replace("-", " ")} · F&G ${route.fearGreed}` : ""}
                · each coin: own RSI, turnover, checks, conviction
              </p>
            </div>
          </div>
          {deploying && primarySym && onDeploy && (
            <button
              type="button"
              onClick={() => onDeploy(primarySym)}
              className="rounded-xl border border-emerald-400/45 bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-100 transition hover:bg-emerald-500/30"
            >
              Trade {primarySym}
            </button>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {GATE_SYMBOLS.map((sym) => {
            const bench = benchmarks.find((b) => b.symbol === sym);
            const rank = rankBySym[sym];
            const active = selected === sym;
            const long = bench ? strategyPosition(bench.gate.signal) === "LONG" : false;
            const rsi = bench?.market.rsi;
            const align = bench?.skills?.composite?.alignmentScore;

            return (
              <button
                key={sym}
                type="button"
                onClick={() => onSelect(sym)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition",
                  active
                    ? "border-emerald-400/50 bg-emerald-500/15 ring-1 ring-emerald-400/25"
                    : "border-white/10 bg-black/35 hover:border-white/20",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-white">
                      {rank ? `#${rank.rank} ` : ""}
                      {sym}
                    </p>
                    {rank && (
                      <p className="text-[10px] text-emerald-300/80">{rank.conviction} conviction</p>
                    )}
                  </div>
                  {bench ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                        long ? "bg-emerald-500/25 text-emerald-200" : "bg-white/10 text-white/55",
                      )}
                    >
                      {strategyPosition(bench.gate.signal)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/35">…</span>
                  )}
                </div>

                {bench && (
                  <>
                    <p className="mt-1.5 text-sm font-medium text-white/90">
                      ${bench.market.price.toLocaleString(undefined, {
                        maximumFractionDigits: bench.market.price < 1 ? 6 : 2,
                      })}
                    </p>
                    <p className={cn("text-xs", bench.market.change24h >= 0 ? "text-emerald-300" : "text-rose-300")}>
                      {bench.market.change24h >= 0 ? "+" : ""}
                      {bench.market.change24h.toFixed(2)}% 24h
                      {rsi != null ? ` · RSI ${rsi.toFixed(1)}` : ""}
                    </p>
                    <p className="mt-2 text-[10px] text-white/45">
                      {bench.gate.checksPassed}/{bench.gate.checksTotal} · {bench.gate.tier.toUpperCase()} · edge +
                      {bench.gate.edge ?? 0}
                      {align != null ? ` · ${align}/100 align` : ""}
                    </p>
                    {bench.gate.gaps && bench.gate.gaps.length > 0 && (
                      <p className="mt-1 truncate text-[9px] text-amber-300/85" title={bench.gate.gaps.join("; ")}>
                        gap: {bench.gate.gaps[0]}
                      </p>
                    )}
                    {rank?.rationale && (
                      <p className="mt-1 line-clamp-2 text-[9px] leading-snug text-white/40">{rank.rationale}</p>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {route?.directive && (
          <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/75">{route.directive}</p>
        )}
      </div>
    </section>
  );
}
