"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Route, Wallet } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { cn } from "@/lib/utils";

export type CapitalRoutePayload = {
  route: {
    regime: string;
    fearGreed: number;
    directive: string;
    allocation: {
      primary: "BNB" | "CAKE" | "FLAT";
      secondary: "BNB" | "CAKE" | null;
      splitPrimaryPct: number;
      splitSecondaryPct: number;
    };
    ranked: {
      rank: number;
      symbol: string;
      conviction: number;
      permit: string;
      signal: string;
      tier: string;
      edge: number;
      checks: string;
      price: number;
      change24h: number;
    }[];
  };
};

export function GateCapitalRouter({
  data,
  loading,
  selected,
  onSelect,
}: {
  data: CapitalRoutePayload | null;
  loading: boolean;
  selected: string;
  onSelect: (sym: string) => void;
}) {
  const route = data?.route;
  const primary = route?.allocation.primary ?? "FLAT";
  const isFlat = primary === "FLAT";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-950/40 via-black/50 to-black/60">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.15),transparent_45%)]" />
      <div className="relative space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ArcIcon3d icon={Route} theme="nexus" size="md" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/90">
                BSC Capital Router
              </p>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                {loading ? "Routing capital…" : isFlat ? "Stay flat" : `Deploy → ${primary}`}
              </h2>
              {route && !loading && (
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/70">{route.directive}</p>
              )}
            </div>
          </div>
          {route && !loading && (
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Macro tape</p>
              <p className="text-sm font-semibold capitalize text-white">{route.regime.replace("-", " ")}</p>
              <p className="text-xs text-white/50">Fear & Greed {Math.round(route.fearGreed)}</p>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            Evaluating BNB and CAKE permits from CoinMarketCap…
          </div>
        )}

        {route && !loading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {route.ranked.map((row) => {
                const isPrimary = row.symbol === primary;
                const active = selected === row.symbol;
                return (
                  <button
                    key={row.symbol}
                    type="button"
                    onClick={() => onSelect(row.symbol)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition",
                      active
                        ? "border-emerald-400/45 bg-emerald-500/10 ring-1 ring-emerald-400/30"
                        : "border-white/10 bg-black/30 hover:border-white/20",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="flex items-center gap-2 text-lg font-bold text-white">
                          #{row.rank} {row.symbol}
                          {isPrimary && !isFlat && (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                              PRIMARY
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-white/45">
                          ${row.price.toLocaleString(undefined, { maximumFractionDigits: 2 })} ·{" "}
                          {row.change24h >= 0 ? "+" : ""}
                          {row.change24h.toFixed(2)}% 24h
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-lg px-2 py-1 text-xs font-bold",
                          row.permit === "GRANT"
                            ? "bg-emerald-500/20 text-emerald-100"
                            : "bg-rose-500/20 text-rose-100",
                        )}
                      >
                        {row.permit}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-[10px] text-white/45">
                        <span>Conviction</span>
                        <span>{row.conviction}/100</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            row.conviction >= 65 ? "bg-emerald-400" : row.conviction >= 45 ? "bg-amber-400" : "bg-rose-400/80",
                          )}
                          style={{ width: `${row.conviction}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[10px] text-white/40">
                        {row.tier.toUpperCase()} · {row.signal.replace("_", " ")} · edge +{row.edge} · {row.checks}{" "}
                        checks
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {!isFlat && route.allocation.secondary && (
              <p className="rounded-lg border border-cyan-400/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-100/90">
                Split: {route.allocation.splitPrimaryPct}% {route.allocation.primary} ·{" "}
                {route.allocation.splitSecondaryPct}% {route.allocation.secondary}
              </p>
            )}

            <Link
              href="/nexus"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/10"
            >
              <Wallet className="h-4 w-4" />
              Enforce permit in NEXUS trading desk
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
