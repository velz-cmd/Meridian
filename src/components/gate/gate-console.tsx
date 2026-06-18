"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { type GateSymbol } from "@/lib/gate-constants";
import { buildGateExecutionUrl } from "@/lib/gate-nexus-bridge";
import { gateSymbolTradableOnTestnet } from "@/lib/gate-product-copy";
import { GateConfigPanel } from "@/components/gate/gate-config-panel";
import { GateOutputPanel } from "@/components/gate/gate-output-panel";
import { GateSkillHeader, GateSkillHero } from "@/components/gate/gate-skill-hero";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import { appendMeridianActivity } from "@/lib/meridian-activity-log";
import { useGateRoute } from "@/hooks/use-gate-route";
import type { GateBenchmarkFull } from "@/lib/gate-route-types";
import "@/styles/gate-skill.css";

type BacktestPayload = {
  ok: boolean;
  error?: string;
  hint?: string;
  bars?: number;
  dataSource?: string;
  backtest?: { totalReturnPct: number; maxDrawdownPct: number; winRatePct: number; roundTrips: number };
  compare?: {
    constitution: { totalReturnPct: number; maxDrawdownPct: number };
    naiveAgent: { totalReturnPct: number; maxDrawdownPct: number };
    edge: { returnDeltaPct: number; drawdownSavedPct: number };
  };
  equityCurves?: { t: string | number; constitution: number; naive: number }[];
  note?: string;
};

export function GateConsole() {
  const router = useRouter();
  const [symbol, setSymbol] = useState<GateSymbol>("BNB");
  const [backtest, setBacktest] = useState<BacktestPayload | null>(null);
  const [btLoading, setBtLoading] = useState(false);
  const [btRequested, setBtRequested] = useState(false);
  const btReq = useRef(0);

  const { route: gateRoute, benchmarks, loading: gateRouteLoading, error: routeError, reload } = useGateRoute(120_000);

  const lastLeadRef = useRef<string | null>(
    typeof window !== "undefined" ? sessionStorage.getItem("meridian-gate-lead-key") : null,
  );
  useEffect(() => {
    const lead = gateRoute?.allocation?.primary;
    if (!lead || gateRouteLoading) return;
    const key = `${lead}|${gateRoute.regime ?? "—"}`;
    if (lastLeadRef.current === key) return;
    lastLeadRef.current = key;
    try {
      sessionStorage.setItem("meridian-gate-lead-key", key);
    } catch {
      /* private mode */
    }
    appendMeridianActivity({
      kind: "gate",
      level: "info",
      message: `Gate ranked · lead ${lead} · regime ${gateRoute.regime ?? "—"}`,
      symbol: lead,
    });
  }, [gateRoute?.allocation?.primary, gateRoute?.regime, gateRouteLoading]);

  const selected: GateBenchmarkFull | undefined = useMemo(
    () => benchmarks.find((b) => b.symbol === symbol) ?? benchmarks[0],
    [benchmarks, symbol],
  );

  const skills = selected?.skills as GateSkillsPayload | undefined;

  const runBacktest = useCallback(async (sym: GateSymbol) => {
    const id = ++btReq.current;
    setBtLoading(true);
    setBtRequested(true);
    setBacktest(null);
    try {
      const res = await fetch(`/api/gate/backtest?symbol=${sym}&days=90`, { cache: "no-store" });
      const data = (await res.json()) as BacktestPayload;
      if (id !== btReq.current) return;
      setBacktest(data);
    } catch {
      if (id === btReq.current) setBacktest({ ok: false, error: "Backtest request failed" });
    } finally {
      if (id === btReq.current) setBtLoading(false);
    }
  }, []);

  const openInNexus = useCallback(() => {
    const sym = symbol;
    const upper = sym.toUpperCase();
    const ranked = gateRoute?.ranked.find((r) => r.symbol === upper);
    const bench = benchmarks.find((b) => b.symbol === upper);
    const permit =
      ranked?.permit === "GRANT" || ranked?.permit === "DENY"
        ? ranked.permit
        : bench?.gate.signal === "ENTER_LONG"
          ? "GRANT"
          : "DENY";
    const params = new URLSearchParams(
      buildGateExecutionUrl({ symbol: upper, permit: permit as "GRANT" | "DENY", tab: "trade" }).split("?")[1],
    );
    if (!gateSymbolTradableOnTestnet(upper)) {
      params.set("scroll", "constitution");
    }
    router.push(`/nexus?${params.toString()}`);
  }, [gateRoute, benchmarks, router, symbol]);

  useEffect(() => {
    setBacktest(null);
    setBtRequested(false);
    btReq.current += 1;
  }, [symbol]);

  useEffect(() => {
    if (benchmarks.length && !benchmarks.find((b) => b.symbol === symbol)) {
      setSymbol(benchmarks[0]!.symbol as GateSymbol);
    }
  }, [benchmarks, symbol]);

  return (
    <div className="flex min-h-screen flex-col" data-gate-page data-gate-skill-desk>
      <GateSkillHeader />
      <GateSkillHero route={gateRoute} cmcLive={benchmarks.some((b) => b.cmcLive)} />

      {routeError && (
        <div className="mx-4 mt-3 rounded-lg border border-[var(--gate-amber-glow)] bg-[var(--gate-amber-dim)] px-4 py-3 text-sm text-[var(--gate-amber)] sm:mx-6">
          <p className="font-medium">{routeError}</p>
          <button type="button" className="mt-2 font-mono text-xs underline" onClick={() => void reload()}>
            Retry scan
          </button>
        </div>
      )}

      <div className="gate-desk-main">
        <GateConfigPanel
          symbol={symbol}
          onSelectSymbol={setSymbol}
          benchmarks={benchmarks}
          route={gateRoute}
          loading={gateRouteLoading}
          skills={skills ?? null}
          backtestLoading={btLoading}
          backtestRequested={btRequested}
          onRunBacktest={() => void runBacktest(symbol)}
          onOpenNexus={openInNexus}
        />
        <GateOutputPanel
          selected={selected}
          skills={skills ?? null}
          loading={gateRouteLoading}
          backtest={backtest}
          backtestLoading={btLoading}
          backtestRequested={btRequested}
          onRunBacktest={() => void runBacktest(symbol)}
          onOpenNexus={openInNexus}
        />
      </div>
    </div>
  );
}
