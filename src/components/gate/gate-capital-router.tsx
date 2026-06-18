"use client";

import { Loader2, TrendingUp } from "lucide-react";
import { strategyPosition } from "@/lib/gate-strategy-copy";
import type { GateRoutePayload } from "@/lib/gate-route-types";
import { cn } from "@/lib/utils";

export function GateCapitalRouter({
  route,
  loading,
  selectedSymbol,
  onSelectSymbol,
  onDeploy,
  compact,
}: {
  route: GateRoutePayload | null;
  loading?: boolean;
  selectedSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
  onDeploy?: (symbol: string) => void;
  compact?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" /> Routing BSC capital from live CMC…
      </div>
    );
  }

  if (!route) return null;

  const { allocation, ranked, regime, fearGreed, directive } = route;
  const deploying = allocation.primary !== "FLAT";
  const primarySym = allocation.primary;

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-950/40 via-black/50 to-black/60">
      <div className={cn("space-y-4", compact ? "p-4" : "p-5 sm:p-6")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/15">
              <TrendingUp className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/90">
                BSC capital router · live
              </p>
              <h2 className="text-lg font-semibold text-white">
                {deploying ? (
                  <>
                    Deploy {allocation.splitPrimaryPct}%
                    {allocation.secondary ? ` ${primarySym} + ${allocation.splitSecondaryPct}% ${allocation.secondary}` : ` ${primarySym}`}
                  </>
                ) : (
                  "Stay flat — no benchmark clears"
                )}
              </h2>
              <p className="mt-1 text-xs text-white/50">
                {regime.replace("-", " ")} · F&G {fearGreed} · relative conviction — each coin scored on its own CMC tape
              </p>
            </div>
          </div>
          {deploying && onDeploy && (
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
          {ranked.map((row) => {
            const long = strategyPosition(row.signal) === "LONG";
            const active = selectedSymbol?.toUpperCase() === row.symbol;
            const isPrimary = row.symbol === allocation.primary;
            const isSecondary = row.symbol === allocation.secondary;

            return (
              <button
                key={row.symbol}
                type="button"
                onClick={() => onSelectSymbol?.(row.symbol)}
                disabled={!onSelectSymbol}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition",
                  active
                    ? "border-emerald-400/50 bg-emerald-500/15 ring-1 ring-emerald-400/25"
                    : "border-white/10 bg-black/35 hover:border-white/20",
                  !onSelectSymbol && "cursor-default",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">
                    #{row.rank} {row.symbol}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
                      long ? "bg-emerald-500/25 text-emerald-200" : "bg-white/10 text-white/55",
                    )}
                  >
                    {long ? "LONG" : "FLAT"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/70">
                  {row.conviction} conviction · {row.checks} · {row.permit}
                  {row.alignmentScore != null ? ` · ${row.alignmentScore}/100` : ""}
                </p>
                {row.rationale && (
                  <p className="mt-1 line-clamp-2 text-[9px] leading-snug text-white/45" title={row.rationale}>
                    {row.rationale}
                  </p>
                )}
                <p className={cn("text-[10px]", row.change24h >= 0 ? "text-emerald-300" : "text-rose-300")}>
                  ${row.price < 1 ? row.price.toFixed(6) : row.price.toFixed(2)} · {row.change24h >= 0 ? "+" : ""}
                  {row.change24h.toFixed(2)}%
                </p>
                {(isPrimary || isSecondary) && (
                  <p className="mt-1 text-[10px] font-semibold text-emerald-300/90">
                    {isPrimary ? `Primary ${allocation.splitPrimaryPct}%` : `Secondary ${allocation.splitSecondaryPct}%`}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/75">{directive}</p>
      </div>
    </section>
  );
}
