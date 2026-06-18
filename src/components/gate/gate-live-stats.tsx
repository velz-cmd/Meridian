"use client";

import type { GateRoutePayload } from "@/lib/gate-route-types";
import { GATE_PRODUCT } from "@/lib/gate-product-copy";
import { cn } from "@/lib/utils";

export function GateLiveStats({
  route,
  loading,
  cmcLive,
  generatedAt,
  className,
}: {
  route: GateRoutePayload | null;
  loading?: boolean;
  cmcLive?: boolean;
  generatedAt?: string;
  className?: string;
}) {
  const ranked = route?.ranked ?? [];
  const longCount = ranked.filter((r) => r.permit === "GRANT" || r.signal === "ENTER_LONG").length;
  const flatCount = Math.max(0, ranked.length - longCount);
  const primary = route?.allocation?.primary ?? ranked[0]?.symbol ?? "—";
  const primaryPct = route?.allocation?.splitPrimaryPct;
  const regime = route?.regime ?? "neutral";
  const fg = route?.fearGreed ?? 50;

  const refreshed = generatedAt
    ? new Date(generatedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : "—";

  const stats = [
    {
      label: "Market feed",
      value: loading ? "…" : cmcLive ? "Live" : "Cached",
      sub: `Updated ${refreshed}`,
      accent: cmcLive ? "text-emerald-300" : "text-amber-300",
    },
    {
      label: "Router pick",
      value: loading ? "…" : primary,
      sub:
        primaryPct != null
          ? `${primaryPct}% notional · ${regime.replace(/-/g, " ")}`
          : GATE_PRODUCT.rankingFlat,
      accent: "text-white",
    },
    {
      label: "Permits today",
      value: loading ? "…" : `${longCount} clear`,
      sub: `${flatCount} blocked · sentiment ${fg}`,
      accent: longCount > 0 ? "text-emerald-300" : "text-white/80",
    },
    {
      label: "Benchmarks",
      value: loading ? "…" : String(ranked.length || 4),
      sub: "BNB · CAKE · FLOKI · XVS",
      accent: "text-white/90",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-2 lg:grid-cols-4", className)}>
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5"
        >
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">{s.label}</p>
          <p className={cn("mt-0.5 text-lg font-bold tabular-nums", s.accent)}>{s.value}</p>
          <p className="mt-0.5 text-[10px] leading-snug text-white/45">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}
