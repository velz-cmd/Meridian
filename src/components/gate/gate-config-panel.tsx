"use client";

import { Loader2 } from "lucide-react";
import { GATE_SYMBOLS, type GateSymbol } from "@/lib/gate-constants";
import { GATE_PRODUCT, gateSymbolTradableOnTestnet } from "@/lib/gate-product-copy";
import { strategyPosition } from "@/lib/gate-strategy-copy";
import type { GateBenchmarkFull, GateRoutePayload } from "@/lib/gate-route-types";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import { cn } from "@/lib/utils";

export function GateConfigPanel({
  symbol,
  onSelectSymbol,
  benchmarks,
  route,
  loading,
  skills,
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
  skills?: GateSkillsPayload | null;
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
      <div>
        <p className="gate-section-title">BSC benchmarks</p>
        {loading && !benchmarks.length ? (
          <div className="flex items-center gap-2 text-xs text-[var(--gate-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning CMC feed…
          </div>
        ) : (
          <div className="gate-symbol-grid">
            {GATE_SYMBOLS.map((sym) => {
              const bench = benchmarks.find((b) => b.symbol === sym);
              const rank = rankBySym[sym];
              const long = bench ? strategyPosition(bench.gate.signal) === "LONG" : false;
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
                    {bench
                      ? `${bench.gate.checksPassed}/${bench.gate.checksTotal} · ${long ? "LONG" : "FLAT"}`
                      : "—"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {route && (
        <div>
          <p className="gate-section-title">Router</p>
          <p className="text-xs leading-relaxed text-[var(--gate-muted)]">
            {route.allocation.primary !== "FLAT"
              ? GATE_PRODUCT.rankingActive(
                  route.allocation.primary,
                  route.allocation.splitPrimaryPct,
                  route.allocation.secondary ?? undefined,
                  route.allocation.splitSecondaryPct ?? undefined,
                )
              : GATE_PRODUCT.rankingFlat}
          </p>
          <p className="mt-1 font-mono text-[10px] text-[var(--gate-muted)]">
            {GATE_PRODUCT.rankingMeta(
              benchmarks.filter((b) => strategyPosition(b.gate.signal) === "LONG").length,
              benchmarks.filter((b) => strategyPosition(b.gate.signal) === "FLAT").length,
              route.regime,
              route.fearGreed,
            )}
          </p>
        </div>
      )}

      {skills && (
        <div>
          <p className="gate-section-title">Signal layers</p>
          <div className="gate-skill-layer">
            <span className="gate-skill-layer-name">Momentum</span>
            <span className={cn("gate-skill-layer-val", skills.momentum.signal === "ENTER_LONG" && "text-[var(--gate-green)]")}>
              {skills.momentum.signal.replace("_", " ")} · {skills.momentum.checksPassed}/{skills.momentum.checksTotal}
            </span>
          </div>
          <div className="gate-skill-layer">
            <span className="gate-skill-layer-name">Sentiment</span>
            <span className="gate-skill-layer-val">{skills.sentiment.signal.replace("_", " ")}</span>
          </div>
          <div className="gate-skill-layer">
            <span className="gate-skill-layer-name">Regime</span>
            <span className="gate-skill-layer-val">{skills.regime.regime.replace(/-/g, " ")}</span>
          </div>
          <p className="mt-2 font-mono text-[10px] text-[var(--gate-muted)]">
            Alignment {skills.composite.alignmentScore}/100
          </p>
        </div>
      )}

      {selectedBench && (
        <div className="mt-auto space-y-2 pt-2">
          <button
            type="button"
            className="gate-btn-primary"
            onClick={onOpenNexus}
          >
            {tradable ? GATE_PRODUCT.continueTradable(symbol) : GATE_PRODUCT.continueResearch(symbol)}
          </button>
          <button
            type="button"
            className="gate-btn-secondary"
            disabled={backtestLoading}
            onClick={onRunBacktest}
          >
            {backtestLoading ? "Running 90-day replay…" : backtestRequested ? "Re-run historical replay" : "Run 90-day replay"}
          </button>
          <p className="text-center font-mono text-[9px] text-[var(--gate-muted)]">
            Same rules as SKILL.md · CLI · live desk
          </p>
        </div>
      )}
    </aside>
  );
}
