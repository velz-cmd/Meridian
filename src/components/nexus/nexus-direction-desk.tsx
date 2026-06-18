"use client";

import { ArrowDownRight, ArrowUpRight, Loader2, Minus, Shield } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import type { PositionDirection, PositionRoute } from "@/lib/position-router";
import { layerStatusIcon, positionExposureLabel } from "@/lib/position-router";
import { cn } from "@/lib/utils";

const LANES: {
  dir: PositionDirection;
  label: string;
  sub: string;
  icon: typeof ArrowUpRight;
  theme: "emerald" | "zinc" | "rose";
}[] = [
  { dir: "LONG", label: "Long", sub: "Spot / futures bias · own risk", icon: ArrowUpRight, theme: "emerald" },
  { dir: "FLAT", label: "Flat", sub: "No position target", icon: Minus, theme: "zinc" },
  { dir: "SHORT", label: "Short", sub: "Exit bias · perp N/A on Chapel", icon: ArrowDownRight, theme: "rose" },
];

function verdictTheme(dir: PositionDirection) {
  if (dir === "LONG") return "border-emerald-400/40 bg-emerald-500/12 text-emerald-50";
  if (dir === "SHORT") return "border-rose-400/40 bg-rose-500/12 text-rose-50";
  return "border-cyan-400/30 bg-cyan-500/8 text-cyan-50";
}

function layerTone(status: string) {
  if (status === "pass") return "text-emerald-300 border-emerald-400/25 bg-emerald-500/8";
  if (status === "warn") return "text-amber-200 border-amber-400/25 bg-amber-500/8";
  if (status === "block") return "text-rose-200 border-rose-400/25 bg-rose-500/8";
  return "text-white/60 border-white/10 bg-black/25";
}

function laneClass(active: boolean, theme: "emerald" | "zinc" | "rose") {
  if (!active) return "border-white/8 bg-black/20 opacity-55";
  if (theme === "emerald") return "border-emerald-400/45 bg-emerald-500/10 shadow-[0_0_32px_-8px_rgba(52,211,153,0.35)]";
  if (theme === "rose") return "border-rose-400/45 bg-rose-500/10 shadow-[0_0_32px_-8px_rgba(251,113,133,0.35)]";
  return "border-cyan-400/35 bg-cyan-500/8 shadow-[0_0_28px_-10px_rgba(34,211,238,0.3)]";
}

export function NexusDirectionDesk({
  route,
  loading,
  onBuySpot,
  onSellSpot,
  canBuySpot = true,
  canSellSpot = true,
  compact,
}: {
  route: PositionRoute | null;
  loading?: boolean;
  /** Opens spot Buy desk — not a swap mislabeled as LONG */
  onBuySpot?: () => void;
  /** Opens spot Sell desk — exit / reduce, not perp short */
  onSellSpot?: () => void;
  canBuySpot?: boolean;
  canSellSpot?: boolean;
  compact?: boolean;
}) {
  if (loading && !route) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/50">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
        Reading gate position signal (CMC)…
      </div>
    );
  }

  if (!route?.ok) return null;

  const active = route.direction;
  const showSpotActions = Boolean(onBuySpot || onSellSpot);

  return (
    <section className="nexus-direction-desk arc-glass-card arc-glass-card-nexus overflow-hidden rounded-2xl">
      <div className="arc-panel-stripe arc-panel-stripe-nexus h-0.5 w-full" />
      <div className={cn("p-3.5 sm:p-4", compact && "p-3")}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ArcIcon3d icon={Shield} theme="nexus" size="sm" className="!h-8 !w-8" />
            <div>
              <p className="arc-caption text-cyan-300/85">Position signal · spot / futures desk</p>
              <p className="text-sm font-semibold text-white">
                {route.symbol} · {positionExposureLabel(active)} · {route.confidence}%
              </p>
            </div>
          </div>
          {route.gate && (
            <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 font-mono text-[10px] text-violet-100">
              Gate {route.gate.signal.replace(/_/g, " ")} · {route.gate.tier}
            </span>
          )}
        </div>

        <div className={cn("mb-3 rounded-xl border px-3.5 py-3", verdictTheme(active))}>
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-75">Strategy read</p>
          <p className="mt-1 text-sm leading-relaxed opacity-95">{route.verdict}</p>
          {route.sizeNote && (
            <p className="mt-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[11px] leading-relaxed">
              {route.sizeNote}
            </p>
          )}
        </div>

        <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-white/38">
          Position target (long · flat · short) — from CMC gate, not a swap button
        </p>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {LANES.map((lane) => {
            const Icon = lane.icon;
            const isActive = active === lane.dir;
            return (
              <div
                key={lane.dir}
                className={cn("rounded-xl border px-2.5 py-3 transition-all", laneClass(isActive, lane.theme))}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-white/40")} />
                  <span className="text-xs font-bold uppercase tracking-wide">{lane.label}</span>
                </div>
                <p className="mt-1 font-mono text-[9px] leading-snug text-white/45">{lane.sub}</p>
              </div>
            );
          })}
        </div>

        {showSpotActions && (
          <div className="mb-3 rounded-xl border border-white/10 bg-black/35 p-2.5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-white/45">
              Spot desk action · PancakeSwap Chapel (wallet Buy / Sell)
            </p>
            <p className="mb-2 text-[11px] text-white/55">{route.spotActionLabel}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canBuySpot || route.spotAction === "hold" && active !== "LONG"}
                onClick={onBuySpot}
                className={cn(
                  "rounded-xl border py-2.5 text-sm font-semibold transition disabled:opacity-40",
                  route.spotAction === "buy" || active === "LONG"
                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-emerald-400/30",
                )}
              >
                Buy · spot long
              </button>
              <button
                type="button"
                disabled={!canSellSpot}
                onClick={onSellSpot}
                className={cn(
                  "rounded-xl border py-2.5 text-sm font-semibold transition disabled:opacity-40",
                  route.spotAction === "sell" || active === "SHORT"
                    ? "border-rose-400/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-rose-400/30",
                )}
              >
                Sell · spot exit
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-white/35">
              Perp/futures short is not on BSC Testnet. Short signal = sell / de-risk on spot. Binance funding/OI is
              macro context only.
            </p>
          </div>
        )}

        {!compact && (
          <div className="rounded-xl border border-white/8 bg-black/35 px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">Decision stack</p>
            <ul className="mt-2 space-y-1.5">
              {route.layers.map((layer) => (
                <li
                  key={layer.id}
                  className={cn(
                    "flex flex-wrap items-start justify-between gap-2 rounded-lg border px-2.5 py-2 text-[11px]",
                    layerTone(layer.status),
                  )}
                >
                  <div className="min-w-0">
                    <span className="font-semibold">
                      {layerStatusIcon(layer.status)} {layer.label}
                    </span>
                    <p className="mt-0.5 font-mono text-[9px] opacity-70">{layer.source}</p>
                  </div>
                  <span className="max-w-[55%] text-right leading-snug">{layer.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
