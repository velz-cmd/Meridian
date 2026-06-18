"use client";

import { Loader2 } from "lucide-react";
import { GATE_SYMBOLS, type GateSymbol } from "@/lib/gate-constants";
import { strategyPosition } from "@/lib/gate-strategy-copy";
import { cn } from "@/lib/utils";

export type GateBoardRow = {
  symbol: string;
  gate: {
    signal: string;
    tier: string;
    regime?: string;
    confidence?: number;
    edge?: number;
    checksPassed: number;
    checksTotal: number;
  };
  market: { price: number; change24h: number };
};

export function GateStrategyBoard({
  rows,
  selected,
  onSelect,
  loading,
  regime,
  fearGreed,
}: {
  rows: GateBoardRow[];
  selected: GateSymbol;
  onSelect: (sym: GateSymbol) => void;
  loading: boolean;
  regime?: string;
  fearGreed?: number;
}) {
  const longCount = rows.filter((r) => strategyPosition(r.gate.signal) === "LONG").length;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/25">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/85">
              Live strategy scan
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">4 BSC benchmarks · same engine as backtest</h2>
            <p className="mt-1 text-sm text-white/50">
              {longCount} LONG · {rows.length - longCount} FLAT right now
              {regime ? ` · ${regime.replace("-", " ")} regime` : ""}
              {fearGreed != null ? ` · F&G ${fearGreed}` : ""}
            </p>
          </div>
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-white/45">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Refreshing CMC…
            </span>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {GATE_SYMBOLS.map((sym) => {
            const row = rows.find((r) => r.symbol.toUpperCase() === sym);
            const active = selected === sym;
            const position = row ? strategyPosition(row.gate.signal) : null;
            const long = position === "LONG";

            return (
              <button
                key={sym}
                type="button"
                onClick={() => onSelect(sym)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition",
                  active
                    ? "border-emerald-400/45 bg-emerald-500/12 ring-1 ring-emerald-400/20"
                    : "border-white/10 bg-black/35 hover:border-white/20",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-bold text-white">{sym}</p>
                  {row ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        long ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/55",
                      )}
                    >
                      {position}
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/35">…</span>
                  )}
                </div>
                {row && (
                  <>
                    <p className="mt-1 text-sm font-medium text-white/85">
                      ${row.market.price.toLocaleString(undefined, { maximumFractionDigits: row.market.price < 1 ? 6 : 2 })}
                    </p>
                    <p className={cn("text-xs", row.market.change24h >= 0 ? "text-emerald-300" : "text-rose-300")}>
                      {row.market.change24h >= 0 ? "+" : ""}
                      {row.market.change24h.toFixed(2)}% 24h
                    </p>
                    <p className="mt-2 text-[10px] text-white/40">
                      {row.gate.checksPassed}/{row.gate.checksTotal} checks · {row.gate.tier.toUpperCase()}
                      {row.gate.edge != null ? ` · edge +${row.gate.edge}` : ""}
                    </p>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
