"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { GATE_PRODUCT, gateSymbolTradableOnTestnet } from "@/lib/gate-product-copy";
import { strategyPosition } from "@/lib/gate-strategy-copy";
import type { GateRoutePayload } from "@/lib/gate-route-types";
import { cn } from "@/lib/utils";

/** Compact ranking strip for NEXUS — full detail lives on /gate. */
export function GateCapitalRouter({
  route,
  loading,
  selectedSymbol,
  onSelectSymbol,
  onDeploy,
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
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-xs text-white/50">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating BSC ranking…
      </div>
    );
  }

  if (!route) return null;

  const { allocation, ranked, regime, fearGreed } = route;
  const deploying = allocation.primary !== "FLAT";
  const primarySym = allocation.primary;

  return (
    <section className="rounded-xl border border-white/10 bg-black/35 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">BSC ranking</p>
          <p className="mt-0.5 truncate text-sm text-white/85">
            {deploying && primarySym
              ? GATE_PRODUCT.rankingActive(
                  primarySym,
                  allocation.splitPrimaryPct,
                  allocation.secondary ?? undefined,
                  allocation.splitSecondaryPct ?? undefined,
                )
              : GATE_PRODUCT.rankingFlat}
          </p>
          <p className="mt-0.5 text-[11px] text-white/40">
            {regime.replace(/-/g, " ")} tape · sentiment {fearGreed}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onDeploy && (selectedSymbol || primarySym) && (
            <button
              type="button"
              onClick={() => {
                const sym = (selectedSymbol ?? primarySym ?? "").toUpperCase();
                if (sym) onDeploy(sym);
              }}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-white/90"
            >
              {gateSymbolTradableOnTestnet(selectedSymbol ?? primarySym ?? "")
                ? GATE_PRODUCT.continueTradable(selectedSymbol ?? primarySym ?? "")
                : GATE_PRODUCT.continueResearch(selectedSymbol ?? primarySym ?? "")}
            </button>
          )}
          <Link
            href="/gate"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:border-white/25 hover:text-white"
          >
            Full router
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {ranked.map((row) => {
          const long = strategyPosition(row.signal) === "LONG";
          const active = selectedSymbol?.toUpperCase() === row.symbol;
          return (
            <button
              key={row.symbol}
              type="button"
              disabled={!onSelectSymbol}
              onClick={() => onSelectSymbol?.(row.symbol)}
              className={cn(
                "rounded-md border px-2 py-1 text-[11px] transition",
                active
                  ? "border-white/30 bg-white/10 text-white"
                  : "border-white/10 bg-black/30 text-white/60 hover:border-white/20",
                !onSelectSymbol && "cursor-default",
              )}
            >
              #{row.rank} {row.symbol}{" "}
              <span className={long ? "text-emerald-300/90" : "text-white/40"}>
                {long ? "long" : "flat"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
