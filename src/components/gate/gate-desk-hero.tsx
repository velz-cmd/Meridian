"use client";

import { Loader2, Scale, Wifi, WifiOff } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { GATE_PRODUCT } from "@/lib/gate-product-copy";
import { nexusGlassCta } from "@/lib/nexus-action-glass";
import type { GateRoutePayload } from "@/lib/gate-route-types";
import { cn } from "@/lib/utils";

export function GateDeskHero({
  route,
  cmcLive,
  loading,
  leadSymbol,
  onOpenNexus,
  onRunBacktest,
  backtestLoading,
  compact,
}: {
  route: GateRoutePayload | null;
  cmcLive: boolean;
  loading?: boolean;
  leadSymbol?: string;
  onOpenNexus?: () => void;
  onRunBacktest?: () => void;
  backtestLoading?: boolean;
  /** Title + live badge only — actions live in sidebar */
  compact?: boolean;
}) {
  const lead = route?.allocation.primary;
  const hasLead = lead && lead !== "FLAT";

  return (
    <section className="gate-desk-hero arc-glass-card arc-glass-card-nexus arc-border-trace relative mb-4 overflow-hidden p-4 pt-5 sm:px-5 sm:py-5 sm:pt-6">
      <div className="arc-panel-stripe arc-panel-stripe-nexus absolute inset-x-0 top-0 h-1" />
      <div className="nexus-alpha-hero-glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <ArcIcon3d icon={Scale} theme="nexus" size="md" delay={0.1} />
            <p className="arc-caption text-cyan-300/85">GATE · Strategy skill</p>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                cmcLive && !loading
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/5 text-white/45",
              )}
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : cmcLive ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {loading ? "Syncing" : cmcLive ? "CMC live" : "Cached feed"}
            </span>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl md:text-[1.65rem]">
            <span className="text-white/90">Turn market data into </span>
            <span className="arc-gradient-text">backtestable strategy</span>
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[var(--arc-text-muted)] sm:text-sm">
            {GATE_PRODUCT.subtitle} Use tabs for overview, technical RSI/reasoning, rules, and replay.
          </p>

          {!compact && route && (
            <p className="mt-3 font-mono text-[11px] text-white/45">
              {hasLead
                ? GATE_PRODUCT.rankingActive(
                    lead,
                    route.allocation.splitPrimaryPct,
                    route.allocation.secondary ?? undefined,
                    route.allocation.splitSecondaryPct ?? undefined,
                  )
                : GATE_PRODUCT.rankingFlat}{" "}
              · {GATE_PRODUCT.rankingMeta(
                route.ranked.filter((r) => r.signal === "ENTER_LONG").length,
                route.ranked.filter((r) => r.signal !== "ENTER_LONG").length,
                route.regime,
                route.fearGreed,
              )}
            </p>
          )}
        </div>

        {!compact && onOpenNexus && onRunBacktest && (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <button type="button" onClick={onOpenNexus} className={cn(nexusGlassCta("buy"), "min-w-[168px] px-5 py-2.5 text-sm")}>
              {leadSymbol ? GATE_PRODUCT.continueTradable(leadSymbol) : GATE_PRODUCT.openExecution}
            </button>
            <button
              type="button"
              disabled={backtestLoading}
              onClick={onRunBacktest}
              className="arc-btn-signal min-w-[168px] rounded-xl border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/80 transition hover:border-cyan-400/35 hover:bg-cyan-500/10 hover:text-white disabled:opacity-50"
            >
              {backtestLoading ? "Running replay…" : "90-day replay"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
