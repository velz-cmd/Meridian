"use client";

import { ArrowDownRight, ArrowUpRight, Loader2, Minus, Shield } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import type { PositionDirection, PositionRoute } from "@/lib/position-router";
import { layerStatusIcon } from "@/lib/position-router";
import { cn } from "@/lib/utils";

const LANES: {
  dir: PositionDirection;
  label: string;
  sub: string;
  icon: typeof ArrowUpRight;
  theme: "emerald" | "zinc" | "rose";
}[] = [
  { dir: "LONG", label: "Long", sub: "tBNB → asset", icon: ArrowUpRight, theme: "emerald" },
  { dir: "FLAT", label: "Flat", sub: "No new size", icon: Minus, theme: "zinc" },
  { dir: "SHORT", label: "Short hedge", sub: "Asset → USDC", icon: ArrowDownRight, theme: "rose" },
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
  if (!active) return "border-white/8 bg-black/20 opacity-50";
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
        Running constitution gate → cascade check → settlement path…
      </div>
    );
  }

  if (!route?.ok) return null;

  const active = route.direction;

  return (
    <section className="nexus-direction-desk arc-glass-card arc-glass-card-nexus overflow-hidden rounded-2xl">
      <div className="arc-panel-stripe arc-panel-stripe-nexus h-0.5 w-full" />
      <div className="p-3.5 sm:p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ArcIcon3d icon={Shield} theme="nexus" size="sm" className="!h-8 !w-8" />
            <div>
              <p className="arc-caption text-cyan-300/85">Settlement direction · deterministic</p>
              <p className="text-sm font-semibold text-white">
                {route.symbol} · {route.confidence}% conviction · {route.settlement.venue}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-lg font-bold tracking-tight">{active}</p>
            <span className="font-mono text-[10px] uppercase opacity-80">{route.method.split(":")[0]}</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed opacity-95">{route.verdict}</p>
          {route.sizeNote && (
            <p className="mt-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[11px] leading-relaxed">
              Size note: {route.sizeNote}
            </p>
          )}
        </div>

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
                <p className="mt-1 font-mono text-[9px] text-white/45">{lane.sub}</p>
              </div>
            );
          })}
        </div>

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

        {route.execution.tradable && route.execution.kind !== "none" && (
          <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/6 px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-200/70">On-chain path</p>
            <p className="mt-1 text-sm font-medium text-white/90">{route.execution.path}</p>
          </div>
        )}

        {!route.execution.tradable && route.direction !== "FLAT" && (
          <p className="mt-2 text-[11px] text-white/45">{route.execution.path}</p>
        )}

        <p className="mt-2 text-[10px] leading-relaxed text-white/35">{route.settlement.note}</p>

        {onExecute && route.execution.tradable && route.execution.kind !== "none" && (
          <button
            type="button"
            disabled={executing}
            onClick={onExecute}
            className="arc-btn-signal mt-3 w-full rounded-xl border border-cyan-400/35 bg-cyan-500/12 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:opacity-50"
          >
            {executing ? "Signing on Chapel…" : `Execute ${route.direction} · wallet swap`}
          </button>
        )}
      </div>
    </section>
  );
}
