"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { GateRoutePayload } from "@/lib/gate-route-types";

type StepState = "idle" | "live" | "ok" | "warn" | "block";

const STEP_STYLE: Record<StepState, string> = {
  idle: "border-white/10 bg-white/[0.03] text-white/50",
  live: "border-cyan-400/35 bg-cyan-500/10 text-cyan-100",
  ok: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
  warn: "border-amber-400/35 bg-amber-500/10 text-amber-100",
  block: "border-rose-400/35 bg-rose-500/10 text-rose-100",
};

export function MeridianPipelineBar({
  route,
  routeLoading,
  selectedSymbol,
  permitStatus,
  feedLive,
  className,
}: {
  route: GateRoutePayload | null;
  routeLoading?: boolean;
  selectedSymbol?: string;
  permitStatus?: "GRANT" | "DENY" | "PENDING" | null;
  feedLive?: boolean;
  className?: string;
}) {
  const sym = selectedSymbol?.replace(/^\$/, "").trim().toUpperCase() ?? "—";
  const primary = route?.allocation?.primary ?? "—";
  const ranked = route?.ranked?.find((r) => r.symbol === sym);
  const checks = ranked?.checks ?? "—";

  const steps = [
    {
      key: "watch",
      label: "Watch",
      detail: feedLive ? "Feed live" : "Feed sync",
      state: (feedLive ? "live" : "warn") as StepState,
    },
    {
      key: "score",
      label: "Score",
      detail: sym !== "—" ? `${sym} · ${checks}` : "Pick token",
      state: (ranked ? "ok" : "idle") as StepState,
    },
    {
      key: "route",
      label: "Route",
      detail: routeLoading ? "Ranking…" : `Lead · ${primary}`,
      state: (routeLoading ? "idle" : primary !== "—" ? "live" : "idle") as StepState,
    },
    {
      key: "permit",
      label: "Permit",
      detail:
        permitStatus === "GRANT"
          ? "Cleared"
          : permitStatus === "DENY"
            ? "Blocked"
            : permitStatus === "PENDING"
              ? "Checking…"
              : "Awaiting",
      state: (permitStatus === "GRANT"
        ? "ok"
        : permitStatus === "DENY"
          ? "block"
          : permitStatus === "PENDING"
            ? "live"
            : "idle") as StepState,
    },
  ];

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-black/30 px-3 py-2.5 sm:px-4",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          Autonomous pipeline
        </p>
        <Link href="/gate" className="text-[10px] font-semibold text-emerald-300/90 hover:underline">
          Open router →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-stretch gap-1">
            <div className={cn("min-w-0 flex-1 rounded-xl border px-2.5 py-2", STEP_STYLE[s.state])}>
              <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{s.label}</p>
              <p className="mt-0.5 truncate text-[11px] font-semibold">{s.detail}</p>
            </div>
            {i < steps.length - 1 && (
              <span className="hidden self-center text-white/20 sm:inline" aria-hidden>
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
