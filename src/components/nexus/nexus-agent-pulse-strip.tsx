"use client";

import { Loader2, Radio, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import type { MarketPulse } from "@/lib/market-pulse";
import { cn } from "@/lib/utils";

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

function stanceTone(stance: MarketPulse["agentStance"]) {
  if (stance === "LONG") return "text-emerald-300 border-emerald-400/35 bg-emerald-500/10";
  if (stance === "DE_RISK") return "text-rose-300 border-rose-400/35 bg-rose-500/10";
  return "text-cyan-200/80 border-cyan-400/25 bg-cyan-500/8";
}

export function NexusAgentPulseStrip({
  pulse,
  loading,
  symbol,
  compact,
}: {
  pulse: MarketPulse | null;
  loading?: boolean;
  symbol?: string;
  compact?: boolean;
}) {
  if (loading && !pulse) {
    return (
      <div className="nexus-agent-pulse flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-white/50">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
        Syncing market pulse for agent…
      </div>
    );
  }

  if (!pulse?.ok) return null;

  const Icon =
    pulse.agentStance === "LONG" ? TrendingUp : pulse.agentStance === "DE_RISK" ? ShieldAlert : Radio;

  return (
    <div
      className={cn(
        "nexus-agent-pulse arc-glass-card arc-glass-card-nexus overflow-hidden",
        compact ? "rounded-xl" : "rounded-2xl",
      )}
    >
      <div className="arc-panel-stripe arc-panel-stripe-nexus h-0.5 w-full" />
      <div className={cn("flex flex-col gap-3", compact ? "p-3" : "p-3.5 sm:p-4")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <ArcIcon3d icon={Icon} theme="nexus" size="sm" className="!h-8 !w-8 shrink-0" />
            <div className="min-w-0">
              <p className="arc-caption text-cyan-300/80">Agent market pulse · live</p>
              <p className="mt-0.5 text-sm font-semibold leading-snug text-white">{pulse.headline}</p>
              {pulse.flushProxyUsd60m != null && pulse.flushProxyUsd60m >= 5_000_000 && (
                <p className="mt-1 font-mono text-[10px] text-white/45">
                  Flush proxy ~{fmtUsd(pulse.flushProxyUsd60m)} / 60m · {pulse.flushProxyLabel}
                </p>
              )}
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider",
              stanceTone(pulse.agentStance),
            )}
          >
            Agent · {pulse.agentStance.replace("_", " ")}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {pulse.factors.slice(0, compact ? 4 : 6).map((f) => (
            <span
              key={f.label}
              className={cn(
                "rounded-md border px-2 py-0.5 font-mono text-[10px]",
                f.impact === "bullish"
                  ? "border-emerald-400/25 bg-emerald-500/8 text-emerald-200/90"
                  : f.impact === "bearish"
                    ? "border-rose-400/25 bg-rose-500/8 text-rose-200/90"
                    : "border-white/10 bg-black/25 text-white/55",
              )}
            >
              {f.label} {f.value}
            </span>
          ))}
          {symbol && pulse.gateSignal && (
            <span className="rounded-md border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] text-violet-200/90">
              {symbol} · {pulse.gateSignal.replace(/_/g, " ")}
            </span>
          )}
        </div>

        <p className="text-xs leading-relaxed text-white/55">
          <span className="font-medium text-white/75">Agent directive:</span> {pulse.agentDirective}
        </p>

        {pulse.cascadeLevel !== "normal" && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/8 px-2.5 py-2 text-[11px] text-rose-100/90">
            <TrendingDown className="h-3.5 w-3.5 shrink-0" />
            Cascade stress {pulse.cascadeLevel} — autopilot blocks new longs until tape stabilizes.
          </div>
        )}
      </div>
    </div>
  );
}
