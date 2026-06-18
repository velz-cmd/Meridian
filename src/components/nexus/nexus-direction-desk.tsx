"use client";

import { ArrowDownRight, ArrowUpRight, Loader2, Minus, Shield } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import type { PositionDirection, PositionRoute } from "@/lib/position-router";
import { cn } from "@/lib/utils";

const LANES: {
  dir: PositionDirection;
  label: string;
  sub: string;
  icon: typeof ArrowUpRight;
  theme: "emerald" | "zinc" | "rose";
}[] = [
  {
    dir: "LONG",
    label: "Long",
    sub: "tBNB → risk asset",
    icon: ArrowUpRight,
    theme: "emerald",
  },
  {
    dir: "FLAT",
    label: "Flat",
    sub: "No new size",
    icon: Minus,
    theme: "zinc",
  },
  {
    dir: "SHORT",
    label: "Short hedge",
    sub: "Asset → USDC",
    icon: ArrowDownRight,
    theme: "rose",
  },
];

function laneClass(active: boolean, theme: "emerald" | "zinc" | "rose") {
  if (!active) return "border-white/8 bg-black/20 opacity-55";
  if (theme === "emerald") return "border-emerald-400/45 bg-emerald-500/10 shadow-[0_0_32px_-8px_rgba(52,211,153,0.35)]";
  if (theme === "rose") return "border-rose-400/45 bg-rose-500/10 shadow-[0_0_32px_-8px_rgba(251,113,133,0.35)]";
  return "border-cyan-400/35 bg-cyan-500/8 shadow-[0_0_28px_-10px_rgba(34,211,238,0.3)]";
}

export function NexusDirectionDesk({
  route,
  loading,
  onExecute,
  executing,
}: {
  route: PositionRoute | null;
  loading?: boolean;
  onExecute?: () => void;
  executing?: boolean;
}) {
  if (loading && !route) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/50">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
        Computing direction from live pulse + funding…
      </div>
    );
  }

  if (!route?.ok) return null;

  const active = route.direction;

  return (
    <section className="nexus-direction-desk arc-glass-card arc-glass-card-nexus overflow-hidden rounded-2xl">
      <div className="arc-panel-stripe arc-panel-stripe-nexus h-0.5 w-full" />
      <div className="p-3.5 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <ArcIcon3d icon={Shield} theme="nexus" size="sm" className="!h-8 !w-8" />
            <div>
              <p className="arc-caption text-cyan-300/85">Direction router · spot-native</p>
              <p className="text-sm font-semibold text-white">
                {route.symbol} · {route.confidence}% conviction · {route.settlement.venue}
              </p>
            </div>
          </div>
          {route.derivatives && (
            <span className="font-mono text-[10px] text-white/45">
              {route.derivatives.symbol} fund {route.derivatives.fundingRatePct}
              {route.derivatives.openInterestUsd != null
                ? ` · OI ~$${Math.round(route.derivatives.openInterestUsd / 1e6)}M`
                : ""}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {LANES.map((lane) => {
            const Icon = lane.icon;
            const isActive = active === lane.dir;
            return (
              <div
                key={lane.dir}
                className={cn(
                  "rounded-xl border px-2.5 py-3 transition-all duration-300",
                  laneClass(isActive, lane.theme),
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-white/40")} />
                  <span className="text-xs font-bold uppercase tracking-wide">{lane.label}</span>
                </div>
                <p className="mt-1 font-mono text-[9px] text-white/45">{lane.sub}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 rounded-xl border border-white/8 bg-black/35 px-3 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">Execution path</p>
          <p className="mt-1 text-sm font-medium text-white/90">{route.execution.path}</p>
          <ul className="mt-2 space-y-1">
            {route.reasoning.slice(0, 4).map((r) => (
              <li key={r} className="text-[11px] leading-relaxed text-white/55">
                · {r}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-white/38">{route.settlement.note}</p>

        {onExecute && route.execution.tradable && route.execution.kind !== "none" && (
          <button
            type="button"
            disabled={executing}
            onClick={onExecute}
            className="arc-btn-signal mt-3 w-full rounded-xl border border-cyan-400/35 bg-cyan-500/12 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:opacity-50"
          >
            {executing ? "Signing on Chapel…" : `Execute ${route.direction} · ${route.execution.path.split(" ")[0]}`}
          </button>
        )}
      </div>
    </section>
  );
}
