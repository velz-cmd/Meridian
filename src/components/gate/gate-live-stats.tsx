"use client";

import type { GateRoutePayload } from "@/lib/gate-route-types";
import { deskRouterPickValue } from "@/lib/gate-desk-labels";
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
  const holdCount = Math.max(0, ranked.length - longCount);
  const primaryRaw = route?.allocation?.primary ?? ranked[0]?.symbol ?? "—";
  const routerPick = deskRouterPickValue(primaryRaw);
  const primaryPct = route?.allocation?.splitPrimaryPct;
  const regime = route?.regime ?? "neutral";
  const fg = route?.fearGreed;
  const fgLabel = fg != null ? String(Math.round(fg)) : "DATA UNAVAILABLE";
  const benchmarkSub =
    ranked.length > 0 ? ranked.map((r) => r.symbol).join(" · ") : "Awaiting CMC scan";

  const refreshed = generatedAt
    ? new Date(generatedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : route?.ranked?.[0]
      ? "live"
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
      value: loading ? "…" : routerPick,
      sub:
        routerPick === "HOLD"
          ? GATE_PRODUCT.rankingFlat
          : primaryPct != null
            ? `${primaryRaw} · ${primaryPct}% notional · ${regime.replace(/-/g, " ")}`
            : `${primaryRaw} · ${regime.replace(/-/g, " ")}`,
      accent: routerPick === "HOLD" ? "text-white/80" : "text-emerald-300",
    },
    {
      label: "Permits today",
      value: loading ? "…" : `${longCount} clear`,
      sub: `${holdCount} hold · sentiment ${fgLabel}`,
      accent: longCount > 0 ? "text-emerald-300" : "text-white/80",
    },
    {
      label: "Benchmarks",
      value: loading ? "…" : ranked.length ? String(ranked.length) : "—",
      sub: benchmarkSub,
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
