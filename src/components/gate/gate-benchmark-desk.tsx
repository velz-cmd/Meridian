"use client";

import { Loader2 } from "lucide-react";
import { GATE_SYMBOLS, type GateSymbol } from "@/lib/gate-constants";
import { GATE_PRODUCT, gateSymbolTradableOnTestnet } from "@/lib/gate-product-copy";
import { strategyPosition } from "@/lib/gate-strategy-copy";
import type { GateBenchmarkFull, GateRoutePayload } from "@/lib/gate-route-types";
import { cn } from "@/lib/utils";

/** Ranked BSC benchmarks — selection drives every action below. */
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
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-6 text-sm text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" /> Refreshing market scan…
      </div>
    );
  }

  const ranked = route?.ranked ?? [];
  const rankBySym = Object.fromEntries(ranked.map((r) => [r.symbol, r]));
  const deploying = route && route.allocation.primary !== "FLAT";
  const primarySym = route?.allocation.primary;
  const longCount = benchmarks.filter((b) => strategyPosition(b.gate.signal) === "LONG").length;

  const selectedBench = benchmarks.find((b) => b.symbol === selected);
  const selectedRank = rankBySym[selected];
  const selectedPos = selectedBench ? strategyPosition(selectedBench.gate.signal) : "FLAT";
  const selectedChecks = selectedBench
    ? `${selectedBench.gate.checksPassed}/${selectedBench.gate.checksTotal} rules`
    : "—";

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/45">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="border-b border-white/10 pb-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
            {GATE_PRODUCT.rankingTitle}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">
            {deploying && route && primarySym
              ? GATE_PRODUCT.rankingActive(
                  primarySym,
                  route.allocation.splitPrimaryPct,
                  route.allocation.secondary ?? undefined,
                  route.allocation.splitSecondaryPct ?? undefined,
                )
              : GATE_PRODUCT.rankingFlat}
          </h2>
          {route && (
            <p className="mt-1 text-xs text-white/45">
              {GATE_PRODUCT.rankingMeta(longCount, benchmarks.length - longCount, route.regime, route.fearGreed)}
            </p>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {GATE_SYMBOLS.map((sym) => {
            const bench = benchmarks.find((b) => b.symbol === sym);
            const rank = rankBySym[sym];
            const active = selected === sym;
            const long = bench ? strategyPosition(bench.gate.signal) === "LONG" : false;
            const rsi = bench?.market.rsi;

            return (
              <button
                key={sym}
                type="button"
                onClick={() => onSelect(sym)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition",
                  active
                    ? "border-white/40 bg-white/10 ring-1 ring-white/20"
                    : "border-white/10 bg-black/30 hover:border-white/20 hover:bg-black/40",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    {rank && (
                      <span className="text-[10px] font-medium text-white/35">#{rank.rank}</span>
                    )}
                    <span className="text-sm font-bold text-white">{sym}</span>
                  </div>
                  {bench ? (
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                        long ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/50",
                      )}
                    >
                      {strategyPosition(bench.gate.signal)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/30">…</span>
                  )}
                </div>

                {bench && (
                  <>
                    <p className="mt-2 text-base font-semibold text-white">
                      $
                      {bench.market.price.toLocaleString(undefined, {
                        maximumFractionDigits: bench.market.price < 1 ? 6 : 2,
                      })}
                      <span
                        className={cn(
                          "ml-2 text-xs font-normal",
                          bench.market.change24h >= 0 ? "text-emerald-300/90" : "text-rose-300/90",
                        )}
                      >
                        {bench.market.change24h >= 0 ? "+" : ""}
                        {bench.market.change24h.toFixed(2)}%
                      </span>
                    </p>
                    <p className="mt-1.5 text-[11px] text-white/45">
                      {bench.gate.checksPassed}/{bench.gate.checksTotal} rules pass
                      {rsi != null ? ` · RSI ${rsi.toFixed(0)}` : ""}
                      {rank ? ` · score ${rank.conviction}` : ""}
                    </p>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {selectedBench && onDeploy && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                {GATE_PRODUCT.viewing(selected)}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">
                {GATE_PRODUCT.selectedHeadline(selected, selectedPos, selectedChecks)}
              </p>
              {selectedRank?.rationale && (
                <p className="mt-1 line-clamp-2 text-xs text-white/50">{selectedRank.rationale}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDeploy(selected)}
              className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              {gateSymbolTradableOnTestnet(selected)
                ? GATE_PRODUCT.continueTradable(selected)
                : GATE_PRODUCT.continueResearch(selected)}
            </button>
          </div>
        )}

        {route?.directive && (
          <p className="text-sm leading-relaxed text-white/55">{route.directive}</p>
        )}
      </div>
    </section>
  );
}
