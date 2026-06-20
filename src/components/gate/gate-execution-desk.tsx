"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Loader2,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { buildGateExecutionUrl } from "@/lib/gate-nexus-bridge";
import {
  clampGateLeverage,
  computeGateSpendTbnb,
  saveGateExecutionIntent,
  type GateDeskAction,
} from "@/lib/gate-execution-intent";
import { chapelProxySymbol, CHAPEL_GATE_PROXY } from "@/lib/chapel-execution-router";
import { gateSymbolTradableOnTestnet } from "@/lib/gate-product-copy";
import type { PositionDirection, PositionRoute } from "@/lib/position-router";
import { positionExposureLabel } from "@/lib/position-router";
import { nexusGlassCta } from "@/lib/nexus-action-glass";
import { cn } from "@/lib/utils";

const LANES: {
  dir: PositionDirection;
  label: string;
  sub: string;
  icon: typeof TrendingUp;
}[] = [
  { dir: "LONG", label: "Long", sub: "Spot / futures bias", icon: TrendingUp },
  { dir: "FLAT", label: "Flat", sub: "No target size", icon: Minus },
  { dir: "SHORT", label: "Short", sub: "Exit · perp N/A on Chapel", icon: TrendingDown },
];

const LEV_TICKS = [1, 2, 3, 4, 5] as const;

export function GateExecutionDesk({
  symbol,
  route,
  loading,
  permit,
  permitId,
  compact,
  deskSignal,
}: {
  symbol: string;
  route: PositionRoute | null;
  loading?: boolean;
  permit?: "GRANT" | "DENY";
  permitId?: string;
  compact?: boolean;
  /** Composite desk signal when skills disagree with raw constitution */
  deskSignal?: string;
}) {
  const router = useRouter();
  const sym = symbol.replace(/^\$/, "").trim().toUpperCase();
  const tradable = gateSymbolTradableOnTestnet(sym);
  const chapelProxy = CHAPEL_GATE_PROXY[sym] ?? null;
  const settlementSym = chapelProxySymbol(sym) ?? sym;
  const routeDir = route?.direction ?? "FLAT";
  const confidence = route?.confidence ?? route?.gate?.confidence ?? 50;

  const [direction, setDirection] = useState<PositionDirection>(routeDir);
  const [leverage, setLeverage] = useState(2);

  useEffect(() => {
    setDirection(routeDir);
  }, [routeDir, sym]);

  const derivatives = route?.derivatives;
  const suggestedTbnb = useMemo(
    () => computeGateSpendTbnb(0.05, leverage, confidence, direction),
    [leverage, confidence, direction],
  );

  const sendToNexus = useCallback(
    (action: GateDeskAction, autoStart = false) => {
      const resolvedPermit =
        permit ?? (route?.gate?.signal === "ENTER_LONG" ? "GRANT" : "DENY");
      saveGateExecutionIntent({
        symbol: sym,
        direction,
        leverage: clampGateLeverage(leverage),
        action,
        permit: resolvedPermit,
        permitId,
        autoStart,
        confidence,
        suggestedTbnb,
      });
      router.push(
        buildGateExecutionUrl({
          symbol: sym,
          permit: resolvedPermit,
          permitId,
          action,
          direction,
          leverage: clampGateLeverage(leverage),
          auto: autoStart,
        }),
      );
    },
    [sym, direction, leverage, permit, permitId, route?.gate?.signal, confidence, suggestedTbnb, router],
  );

  if (loading && !route) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/50">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
        Loading position signal…
      </div>
    );
  }

  return (
    <section
      className={cn(
        "gate-execution-desk arc-glass-card arc-glass-card-nexus overflow-hidden rounded-2xl border border-violet-400/20",
        compact && "text-sm",
      )}
    >
      <div className="arc-panel-stripe arc-panel-stripe-nexus h-0.5 w-full bg-gradient-to-r from-violet-500/80 via-cyan-400/60 to-emerald-400/50" />
      <div className={cn("p-4 sm:p-5", compact && "p-3")}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ArcIcon3d icon={Sparkles} theme="nexus" size="sm" className="!h-9 !w-9" />
            <div>
              <p className="arc-caption text-violet-200/90">Execution desk · strategy → NEXUS settlement</p>
              <p className="text-base font-semibold text-white">
                {sym} · {positionExposureLabel(direction)}
              </p>
            </div>
          </div>
          {(route?.gate || deskSignal) && (
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] text-cyan-100">
              Desk {(deskSignal ?? route?.gate?.signal ?? "HOLD").replace(/_/g, " ")} · {route?.gate?.tier ?? "—"}
            </span>
          )}
        </div>

        <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-white/38">
          Position target (long · flat · short) — CMC gate signal, not a swap
        </p>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {LANES.map((lane) => {
            const Icon = lane.icon;
            const active = direction === lane.dir;
            return (
              <button
                key={lane.dir}
                type="button"
                onClick={() => setDirection(lane.dir)}
                className={cn(
                  "rounded-xl border px-2.5 py-3 text-left transition",
                  active
                    ? lane.dir === "LONG"
                      ? "border-emerald-400/45 bg-emerald-500/12 shadow-[0_0_28px_-8px_rgba(52,211,153,0.35)]"
                      : lane.dir === "SHORT"
                        ? "border-rose-400/45 bg-rose-500/12 shadow-[0_0_28px_-8px_rgba(251,113,133,0.35)]"
                        : "border-cyan-400/35 bg-cyan-500/8"
                    : "border-white/8 bg-black/20 opacity-60 hover:opacity-90",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-bold uppercase">{lane.label}</span>
                </div>
                <p className="mt-1 font-mono text-[9px] text-white/45">{lane.sub}</p>
              </button>
            );
          })}
        </div>

        <div className="mb-4 rounded-xl border border-white/10 bg-black/35 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">
              Thesis leverage · spot size multiplier
            </p>
            <span className="rounded-lg border border-violet-400/30 bg-violet-500/15 px-2 py-0.5 font-mono text-sm font-bold text-violet-100">
              {leverage}x
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={leverage}
            onChange={(e) => setLeverage(clampGateLeverage(Number(e.target.value)))}
            className="gate-leverage-slider mb-2 w-full accent-violet-400"
          />
          <div className="flex justify-between gap-1">
            {LEV_TICKS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setLeverage(t)}
                className={cn(
                  "flex-1 rounded-lg py-1 font-mono text-[10px] font-semibold transition",
                  leverage === t
                    ? "bg-violet-500/25 text-violet-100"
                    : "text-white/35 hover:bg-white/5",
                )}
              >
                {t}x
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-white/40">
            Sizes spot desk on NEXUS (~{suggestedTbnb.toFixed(4)} tBNB template at {confidence}% conf). Binance
            perp not on Chapel — funding/OI is macro context only.
          </p>
          {derivatives && (
            <div className="mt-2 grid grid-cols-3 gap-1.5 font-mono text-[9px] text-white/45">
              <span className="rounded border border-white/8 bg-black/30 px-1.5 py-1">
                Fund {derivatives.fundingRatePct}
              </span>
              <span className="rounded border border-white/8 bg-black/30 px-1.5 py-1">
                Mark ${derivatives.markPrice.toFixed(2)}
              </span>
              <span className="rounded border border-white/8 bg-black/30 px-1.5 py-1">
                OI{" "}
                {derivatives.openInterestUsd != null
                  ? `$${(derivatives.openInterestUsd / 1e6).toFixed(1)}M`
                  : "—"}
              </span>
            </div>
          )}
        </div>

        {chapelProxy && (
          <p className="mb-3 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-100">
            {sym} thesis uses live CMC data. Chapel has no {sym} pool — wallet swap routes through {chapelProxy} on
            BSC Testnet while keeping {sym} gate signals.
          </p>
        )}

        {!tradable && (
          <p className="mb-3 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
            {sym} is gate-eval only on Chapel — open NEXUS for constitution view; swap BNB or CAKE on testnet.
          </p>
        )}

        <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-white/38">
          Settlement on NEXUS · PancakeSwap Chapel ({settlementSym} · wallet Buy / Sell / Autopilot)
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            disabled={direction === "FLAT" && routeDir !== "LONG"}
            onClick={() => sendToNexus("buy")}
            className={cn(nexusGlassCta("buy"), "min-h-[48px] py-3 text-sm font-semibold")}
          >
            <span className="flex items-center justify-center gap-1.5">
              <ArrowUpRight className="h-4 w-4" />
              Buy · spot
            </span>
          </button>
          <button
            type="button"
            onClick={() => sendToNexus("sell")}
            className={cn(nexusGlassCta("sell"), "min-h-[48px] py-3 text-sm font-semibold")}
          >
            <span className="flex items-center justify-center gap-1.5">
              <ArrowDownRight className="h-4 w-4" />
              Sell · spot
            </span>
          </button>
          <button
            type="button"
            onClick={() => sendToNexus("agent", true)}
            className={cn(
              nexusGlassCta("autopilot"),
              "min-h-[48px] border-violet-400/40 bg-violet-500/15 py-3 text-sm font-semibold text-violet-50",
            )}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Bot className="h-4 w-4" />
              Autopilot
            </span>
          </button>
        </div>
        <p className="mt-2 text-center font-mono text-[9px] text-white/32">
          Router never signs — all swaps execute in NEXUS trade desk on BSC Testnet
        </p>
      </div>
    </section>
  );
}
