"use client";

import { useEffect, useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import type { AutopilotDeskCycle, AutopilotVenue } from "@/lib/autopilot-desk-engine";
import { cn } from "@/lib/utils";

function layerTone(status: string) {
  if (status === "pass") return "text-emerald-300 border-emerald-400/25 bg-emerald-500/8";
  if (status === "warn") return "text-amber-200 border-amber-400/25 bg-amber-500/8";
  if (status === "block") return "text-rose-200 border-rose-400/25 bg-rose-500/8";
  return "text-white/60 border-white/10 bg-black/25";
}

function actionTone(action: string) {
  if (action === "OPEN_LONG") return "text-emerald-300";
  if (action === "OPEN_SHORT" || action === "EXIT") return "text-rose-300";
  return "text-white/70";
}

/** Live autonomous desk read — same engine as POST /api/nexus/autopilot/cycle */
export function AutopilotDeskPreview({
  symbol,
  venue,
  hasPosition,
}: {
  symbol: string | null;
  venue: AutopilotVenue;
  hasPosition?: boolean;
}) {
  const [cycle, setCycle] = useState<AutopilotDeskCycle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setCycle(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({
      symbol,
      venue,
      hasPosition: hasPosition ? "1" : "0",
    });
    fetch(`/api/nexus/autopilot/cycle?${q}`, { cache: "no-store" })
      .then(async (r) => {
        const data = (await r.json()) as AutopilotDeskCycle & { error?: string };
        if (!r.ok) throw new Error(data.error ?? "Desk cycle failed");
        if (!cancelled) setCycle(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Desk cycle failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, venue, hasPosition]);

  if (!symbol) return null;

  return (
    <section className="rounded-xl border border-cyan-400/20 bg-cyan-950/15 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200/85">
          <Activity className="h-3.5 w-3.5" />
          Autonomous desk · {venue} · not a forecast
        </p>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />}
      </div>

      {error && <p className="text-xs text-rose-300">{error}</p>}

      {cycle && !error && (
        <>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className={cn("text-lg font-bold uppercase", actionTone(cycle.action))}>
              {cycle.action.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-white/45">
              {cycle.confidence}% · {cycle.execute.tradeThisCycle ? "trade this cycle" : "hold"}
            </span>
            {venue === "futures" && (
              <span className="rounded border border-violet-400/30 bg-violet-500/10 px-1.5 py-0.5 text-[9px] text-violet-200">
                signal · {cycle.execute.futuresSignal}
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/75">{cycle.thesis}</p>
          <p className="mt-1 text-[10px] text-white/40">{cycle.execute.venueNote}</p>
          <ul className="mt-2 space-y-1">
            {cycle.layers.map((layer) => (
              <li
                key={layer.id}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-[10px]",
                  layerTone(layer.status),
                )}
              >
                <span className="font-semibold">{layer.label}</span>
                <span className="text-white/50"> · {layer.detail}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
