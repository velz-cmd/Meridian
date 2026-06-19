"use client";

import { Loader2 } from "lucide-react";
import { ArcPanel } from "@/components/ui/arc-panel";
import { GATE_SYMBOLS, type GateSymbol } from "@/lib/gate-constants";
import { GATE_PRODUCT, gateSymbolTradableOnTestnet } from "@/lib/gate-product-copy";
import { effectivePosition } from "@/lib/gate-effective-signal";
import { nexusGlassCta } from "@/lib/nexus-action-glass";
import type { GateBenchmarkFull, GateRoutePayload } from "@/lib/gate-route-types";
import { cn } from "@/lib/utils";

export function GateConfigPanel({
  symbol,
  onSelectSymbol,
  benchmarks,
  route,
  loading,
  backtestLoading,
  backtestRequested,
  onRunBacktest,
  onOpenNexus,
}: {
  symbol: GateSymbol;
  onSelectSymbol: (sym: GateSymbol) => void;
  benchmarks: GateBenchmarkFull[];
  route: GateRoutePayload | null;
  loading?: boolean;
  backtestLoading: boolean;
  backtestRequested: boolean;
  onRunBacktest: () => void;
  onOpenNexus: () => void;
}) {
  const rankBySym = Object.fromEntries((route?.ranked ?? []).map((r) => [r.symbol, r]));
  const selectedBench = benchmarks.find((b) => b.symbol === symbol);
  const tradable = gateSymbolTradableOnTestnet(symbol);

  return (
    <aside className="gate-config-panel">
      <ArcPanel theme="nexus" title="BSC benchmarks" className="gate-panel">
        {loading && !benchmarks.length ? (
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" /> Scanning CMC feed…
          </div>
        ) : (
          <div className="gate-symbol-grid">
            {GATE_SYMBOLS.map((sym) => {
              const bench = benchmarks.find((b) => b.symbol === sym);
              const rank = rankBySym[sym];
              const long = bench ? effectivePosition(bench.gate, bench.skills as never) === "LONG" : false;
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => onSelectSymbol(sym)}
                  className={cn("gate-symbol-card", symbol === sym && "active")}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="gate-symbol-name">{sym}</span>
                    {rank && <span className="gate-symbol-rank">#{rank.rank}</span>}
                  </div>
                  <p className="gate-symbol-meta">
                    {bench ? (
                      <>
                        <span className={long ? "text-emerald-400" : "text-white/40"}>{long ? "LONG" : "FLAT"}</span>
                        {" · "}
                        {bench.gate.checksPassed}/{bench.gate.checksTotal}
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </ArcPanel>

      {route && (
        <ArcPanel theme="nexus" title="Capital router" className="gate-panel">
          <p className="text-xs leading-relaxed text-white/55">
            {route.allocation.primary !== "FLAT"
              ? GATE_PRODUCT.rankingActive(
                  route.allocation.primary,
                  route.allocation.splitPrimaryPct,
                  route.allocation.secondary ?? undefined,
                  route.allocation.splitSecondaryPct ?? undefined,
                )
              : GATE_PRODUCT.rankingFlat}
          </p>
          <p className="mt-2 font-mono text-[10px] text-white/40">
            {GATE_PRODUCT.rankingMeta(
              benchmarks.filter((b) => effectivePosition(b.gate, b.skills as never) === "LONG").length,
              benchmarks.filter((b) => effectivePosition(b.gate, b.skills as never) === "FLAT").length,
              route.regime,
              route.fearGreed,
            )}
          </p>
        </ArcPanel>
      )}

      {selectedBench && (
        <div className="gate-config-actions">
          <button type="button" className={cn(nexusGlassCta("buy"), "w-full py-2.5 text-sm")} onClick={onOpenNexus}>
            {tradable ? GATE_PRODUCT.continueTradable(symbol) : GATE_PRODUCT.continueResearch(symbol)}
          </button>
          <button
            type="button"
            className="gate-btn-secondary w-full"
            disabled={backtestLoading}
            onClick={onRunBacktest}
          >
            {backtestLoading ? "Running 90-day replay…" : backtestRequested ? "Re-run historical replay" : "Run 90-day replay"}
          </button>
          <p className="text-center font-mono text-[9px] text-white/35">Same rules as SKILL.md · CLI · live desk</p>
        </div>
      )}
    </aside>
  );
}
