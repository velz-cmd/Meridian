"use client";

import { Loader2 } from "lucide-react";
import {
  strategyPosition,
  strategySignalLabel,
} from "@/lib/gate-strategy-copy";
import { GATE_PRODUCT, gateSymbolTradableOnTestnet } from "@/lib/gate-product-copy";
import { cn } from "@/lib/utils";

type LiveGate = {
  signal: string;
  tier: string;
  regime?: string;
  thesis: string;
  checksPassed: number;
  checksTotal: number;
};

export function GateStrategyLive({
  symbol,
  loading,
  error,
  gate,
  price,
  change24h,
  cmcLive,
  rsiSource,
  positionLabel,
  onOpenNexus,
}: {
  symbol: string;
  loading: boolean;
  error?: string | null;
  gate: LiveGate | null;
  price?: number;
  change24h?: number;
  cmcLive?: boolean;
  rsiSource?: string;
  positionLabel?: "LONG" | "HOLD" | "EXIT";
  onOpenNexus?: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-5 py-8 text-sm text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" />
        Applying live rules for {symbol}…
      </div>
    );
  }

  if (error || !gate) {
    return (
      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-5 py-6 text-sm text-amber-100">
        {error ?? `Could not load strategy output for ${symbol}.`}
      </div>
    );
  }

  const position = positionLabel ?? strategyPosition(gate.signal);
  const long = position === "LONG";

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">
              Rule output
            </p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">{symbol} · rule output</h2>
            {price != null && (
              <p className="mt-1 text-sm text-white/55">
                ${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                {change24h != null && (
                  <span className={change24h >= 0 ? " text-emerald-300" : " text-rose-300"}>
                    {" "}
                    · {change24h >= 0 ? "+" : ""}
                    {change24h.toFixed(2)}% 24h
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Position</p>
              <p className={cn("text-2xl font-bold", long ? "text-emerald-300" : "text-white/70")}>{position}</p>
            </div>
            {onOpenNexus && (
              <button
                type="button"
                onClick={onOpenNexus}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-white/90"
              >
                {gateSymbolTradableOnTestnet(symbol)
                  ? GATE_PRODUCT.continueTradable(symbol)
                  : GATE_PRODUCT.continueResearch(symbol)}
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <OutcomeCell label="Strategy signal" value={strategySignalLabel(gate.signal)} highlight={long} />
          <OutcomeCell label="Setup tier" value={gate.tier.toUpperCase()} />
          <OutcomeCell label="Regime" value={(gate.regime ?? "neutral").replace("-", " ")} />
        </div>

        <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-relaxed text-white/75">
          {gate.thesis}
        </p>

        <p className="text-xs text-white/40">
          {gate.checksPassed}/{gate.checksTotal} conditions met
          {rsiSource?.includes("historical")
            ? " · RSI from daily bars"
            : rsiSource?.includes("binance")
              ? " · RSI from venue daily"
              : ""}
        </p>
      </div>
    </section>
  );
}

function OutcomeCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 capitalize",
        highlight ? "border-emerald-400/35 bg-emerald-500/10" : "border-white/10 bg-black/30",
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-white">{value}</p>
    </div>
  );
}
