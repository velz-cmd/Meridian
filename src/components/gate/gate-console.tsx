"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArcBackground } from "@/components/layout/arc-background";
import { MeridianFooter } from "@/components/layout/meridian-footer";
import { GateCmcArchitecturePanel } from "@/components/gate/gate-cmc-architecture-panel";
import { GateConfigPanel } from "@/components/gate/gate-config-panel";
import { GateDeskHero } from "@/components/gate/gate-desk-hero";
import { GateDeskTabs, type GateDeskTab } from "@/components/gate/gate-desk-tabs";
import { GateConsensusPanel } from "@/components/gate/gate-consensus-panel";
import { extractJudgeConsensus } from "@/lib/gate-consensus-payload";
import { GateTechnicalPanel } from "@/components/gate/gate-technical-panel";
import { usePositionRoute } from "@/hooks/use-position-route";
import { GateLiveStats } from "@/components/gate/gate-live-stats";
import { GateOutputPanel } from "@/components/gate/gate-output-panel";
import { useMarketPulse } from "@/hooks/use-market-pulse";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import { GateOverviewTab } from "@/components/gate/gate-overview-tab";
import { GateStrategySpec } from "@/components/gate/gate-strategy-spec";
import { GateTechnicalChambers } from "@/components/gate/gate-technical-chambers";
import { GateCollapsibleCard } from "@/components/gate/gate-collapsible-card";
import { GateIntelligenceDesk } from "@/components/gate/gate-intelligence-desk";
import { useMeridianIntelligence } from "@/hooks/use-meridian-intelligence";
import { appendMeridianActivity } from "@/lib/meridian-activity-log";
import { trackMeridianEvent } from "@/lib/product-analytics-client";
import { type GateSymbol } from "@/lib/gate-constants";
import { buildGateExecutionUrl } from "@/lib/gate-nexus-bridge";
import { effectiveCleared } from "@/lib/gate-effective-signal";
import {
  clampGateLeverage,
  computeGateSpendTbnb,
  saveGateExecutionIntent,
} from "@/lib/gate-execution-intent";
import { gateSymbolTradableOnTestnet } from "@/lib/gate-product-copy";
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
  const userPickedSymbol = useRef<GateSymbol | null>(null);
  const [symbol, setSymbol] = useState<GateSymbol>("CAKE");
  const [tab, setTab] = useState<GateDeskTab>("overview");
  const [backtest, setBacktest] = useState<BacktestPayload | null>(null);
  const [btLoading, setBtLoading] = useState(false);
  const [btRequested, setBtRequested] = useState(false);
  const btReq = useRef(0);

  const { route: gateRoute, benchmarks, loading: gateRouteLoading, error: routeError, degraded: routeDegraded, reload } = useGateRoute(180_000);

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
  const judgeConsensus = useMemo(() => extractJudgeConsensus(selected?.skills as GateSkillsPayload), [selected?.skills]);
  const cmcLive = benchmarks.some((b) => b.cmcLive);
  const { pulse: marketPulse, loading: pulseLoading } = useMarketPulse(symbol, 90_000);
  const { data: intelligence, loading: intelLoading, error: intelError, reload: reloadIntel } = useMeridianIntelligence(symbol, 120_000);
  const { route: positionRoute, loading: directionLoading } = usePositionRoute(symbol, { intervalMs: 90_000 });

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

  const openInNexus = useCallback(
    (opts?: { autopilot?: boolean }) => {
      const sym = symbol;
      const upper = sym.toUpperCase();
      const ranked = gateRoute?.ranked.find((r) => r.symbol === upper);
      const bench = benchmarks.find((b) => b.symbol === upper);
      const permit = effectiveCleared(
        { signal: bench?.gate.signal ?? "HOLD" },
        bench?.skills as GateSkillsPayload | undefined,
      )
        ? "GRANT"
        : ranked?.permit === "GRANT"
          ? "GRANT"
          : "DENY";
      const direction = positionRoute?.direction ?? "FLAT";
      const leverage = clampGateLeverage(2);
      const confidence = positionRoute?.confidence ?? bench?.gate.confidence ?? 50;
      const autopilot = Boolean(opts?.autopilot ?? (permit === "GRANT" && direction === "LONG"));
      const action = autopilot ? "agent" : permit === "GRANT" && direction === "LONG" ? "buy" : "sell";

      saveGateExecutionIntent({
        symbol: upper,
        direction,
        leverage,
        action,
        permit: permit as "GRANT" | "DENY",
        autoStart: autopilot,
        confidence,
        suggestedTbnb: computeGateSpendTbnb(0.05, leverage, confidence, direction),
      });

      const url = buildGateExecutionUrl({
        symbol: upper,
        permit: permit as "GRANT" | "DENY",
        tab: "trade",
        action,
        direction,
        leverage,
        auto: autopilot,
      });
      const params = new URLSearchParams(url.split("?")[1]);
      if (!gateSymbolTradableOnTestnet(upper)) {
        params.set("scroll", "constitution");
      }
      router.push(`/nexus?${params.toString()}`);
    },
    [gateRoute, benchmarks, router, symbol, positionRoute],
  );

  const openNexusManual = useCallback(() => openInNexus({ autopilot: false }), [openInNexus]);
  const openGateAutopilot = useCallback(() => openInNexus({ autopilot: true }), [openInNexus]);

  useEffect(() => {
    setBacktest(null);
    setBtRequested(false);
    btReq.current += 1;
  }, [symbol]);

  const handleSelectSymbol = useCallback((sym: GateSymbol) => {
    userPickedSymbol.current = sym;
    setSymbol(sym);
    trackMeridianEvent({ kind: "gate_symbol", path: "/gate", symbol: sym, action: "select" });
  }, []);

  useEffect(() => {
    if (userPickedSymbol.current) return;
    if (benchmarks.length && !benchmarks.find((b) => b.symbol === symbol)) {
      const cake = benchmarks.find((b) => b.symbol === "CAKE");
      setSymbol((cake?.symbol ?? benchmarks[0]!.symbol) as GateSymbol);
    }
  }, [benchmarks, symbol]);

  useEffect(() => {
    if (tab === "replay" && !btRequested && !btLoading && selected) {
      void runBacktest(symbol);
    }
  }, [tab, btRequested, btLoading, selected, symbol, runBacktest]);

  return (
    <div className="relative min-h-screen text-white" data-arc-theme="nexus" data-gate-page>
      <ArcBackground theme="nexus" />
      <div className="relative z-10 mx-auto max-w-[1680px] px-4 pb-10 pt-1 sm:px-6">
        <GateDeskHero route={gateRoute} cmcLive={cmcLive} loading={gateRouteLoading} compact />

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <GateLiveStats route={gateRoute} loading={gateRouteLoading} cmcLive={cmcLive} className="flex-1" />
          <Link
            href="/analytics"
            className="shrink-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/60 hover:border-cyan-400/30 hover:text-cyan-200"
          >
            Live analytics →
          </Link>
        </div>

        {routeError && (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
              benchmarks.length
                ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
                : "border-rose-400/30 bg-rose-500/10 text-rose-100"
            }`}
          >
            <p className="font-medium">
              {benchmarks.length
                ? routeDegraded
                  ? "CMC rate-limited — showing cached or Binance venue quotes"
                  : "Live scan note"
                : "Gate scan failed"}
            </p>
            <p className="mt-1 text-xs opacity-90">{routeError}</p>
            <button type="button" className="mt-2 font-mono text-xs underline" onClick={() => void reload()}>
              Retry scan
            </button>
          </div>
        )}

        <div className="gate-desk-main">
          <GateConfigPanel
            symbol={symbol}
            onSelectSymbol={handleSelectSymbol}
            benchmarks={benchmarks}
            route={gateRoute}
            loading={gateRouteLoading}
            backtestLoading={btLoading}
            backtestRequested={btRequested}
            onRunBacktest={() => {
              setTab("replay");
              void runBacktest(symbol);
            }}
            onOpenNexus={openGateAutopilot}
          />

          <div className="gate-workspace min-w-0">
            <GateDeskTabs active={tab} onChange={setTab} skills={skills} />

            {tab === "overview" && (
              <GateOverviewTab
                symbol={symbol}
                selected={selected}
                skills={skills}
                judgeConsensus={judgeConsensus}
                intelligence={intelligence}
                intelLoading={intelLoading}
                positionRoute={positionRoute}
                directionLoading={directionLoading}
                gateRoute={gateRoute}
                benchmarks={benchmarks}
                permit={
                  effectiveCleared(
                    { signal: selected?.gate.signal ?? "HOLD" },
                    skills,
                  )
                    ? "GRANT"
                    : "DENY"
                }
                onGoTab={setTab}
                onOpenNexus={openNexusManual}
                onOpenAutopilot={openGateAutopilot}
              />
            )}

            {tab === "memory" && (
              <div className="gate-v2-stack space-y-6">
                <GateIntelligenceDesk
                  data={intelligence}
                  loading={intelLoading}
                  error={intelError}
                  onReload={() => void reloadIntel()}
                  view="memory"
                />
              </div>
            )}

            {tab === "technical" && selected && (
              <div className="gate-v2-stack space-y-6">
                {skills && <GateTechnicalChambers skills={skills} intelligence={intelligence} />}
                <GateCollapsibleCard
                  title="Bull vs Bear debate"
                  question="Who disagrees?"
                  kicker="Technical & reasoning"
                  summary={
                    judgeConsensus
                      ? `${judgeConsensus.weights.longPct}% long · ${judgeConsensus.weights.bearPct}% bear · ${judgeConsensus.permit.status}`
                      : "Live court consensus"
                  }
                  defaultOpen={false}
                >
                  <GateConsensusPanel consensus={judgeConsensus} />
                </GateCollapsibleCard>
                <GateTechnicalPanel
                  selected={selected}
                  route={gateRoute}
                  skills={skills ?? null}
                  onOpenNexus={openGateAutopilot}
                />
                <GateIntelligenceDesk
                  data={intelligence}
                  loading={intelLoading}
                  error={intelError}
                  onReload={() => void reloadIntel()}
                  view="technical"
                />
              </div>
            )}

            {tab === "rules" && (
              <div className="gate-v2-stack space-y-6">
                <GateCmcArchitecturePanel />
                <GateStrategySpec />
                <GateOutputPanel
                  selected={selected}
                  route={gateRoute}
                  skills={skills ?? null}
                  loading={gateRouteLoading}
                  backtest={backtest}
                  backtestLoading={btLoading}
                  backtestRequested={btRequested}
                  onQuickSelect={handleSelectSymbol}
                  onRunBacktest={() => void runBacktest(symbol)}
                  section="rules"
                />
                <GateIntelligenceDesk
                  data={intelligence}
                  loading={intelLoading}
                  error={intelError}
                  onReload={() => void reloadIntel()}
                  view="rules"
                />
              </div>
            )}

            {tab === "replay" && (
              <div className="gate-v2-stack space-y-6">
                <GateOutputPanel
                  selected={selected}
                  route={gateRoute}
                  skills={skills ?? null}
                  loading={gateRouteLoading}
                  backtest={backtest}
                  backtestLoading={btLoading}
                  backtestRequested={btRequested}
                  onQuickSelect={handleSelectSymbol}
                  onRunBacktest={() => void runBacktest(symbol)}
                  section="replay"
                />
                <GateIntelligenceDesk
                  data={intelligence}
                  loading={intelLoading}
                  error={intelError}
                  onReload={() => void reloadIntel()}
                  view="replay"
                />
              </div>
            )}
          </div>
        </div>

        <MeridianFooter className="mt-8" />
      </div>
    </div>
  );
}
