"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, ExternalLink, Loader2 } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { type GateSymbol } from "@/lib/gate-constants";
import { GITHUB_SKILL, strategyPosition } from "@/lib/gate-strategy-copy";
import { GATE_PRODUCT, gateSymbolTradableOnTestnet } from "@/lib/gate-product-copy";
import { buildGateExecutionUrl } from "@/lib/gate-nexus-bridge";
import { GateStrategyLive } from "@/components/gate/gate-strategy-live";
import { GateCheckRadar } from "@/components/gate/gate-check-radar";
import { GateSkillStack, type GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import { GateDataProvenance } from "@/components/gate/gate-data-provenance";
import { GateEquityChart } from "@/components/gate/gate-equity-chart";
import { GateBenchmarkDesk } from "@/components/gate/gate-benchmark-desk";
import { GateLiveStats } from "@/components/gate/gate-live-stats";
import { MeridianHowItWorks } from "@/components/shared/meridian-how-it-works";
import { useGateRoute } from "@/hooks/use-gate-route";
import type { GateBenchmarkFull } from "@/lib/gate-route-types";

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

  const selected: GateBenchmarkFull | undefined = useMemo(
    () => benchmarks.find((b) => b.symbol === symbol) ?? benchmarks[0],
    [benchmarks, symbol],
  );

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

  const displaySignal = selected?.skills?.composite?.signal ?? selected?.gate.signal ?? "HOLD";
  const underperformed =
    backtest?.ok &&
    backtest.compare &&
    backtest.backtest &&
    backtest.backtest.totalReturnPct < backtest.compare.naiveAgent.totalReturnPct;

  const openInNexus = useCallback(
    (sym: string) => {
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
    },
    [gateRoute, benchmarks, router],
  );

  const handleSelectSymbol = useCallback((sym: GateSymbol) => {
    setSymbol(sym);
    requestAnimationFrame(() => {
      document.getElementById("gate-symbol-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  useEffect(() => {
    setBacktest(null);
    setBtRequested(false);
    btReq.current += 1;
  }, [symbol]);

  return (
    <div className="relative min-h-screen bg-[#070809] text-white" data-gate-page>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.04),_transparent_55%)]" />

      <div className="relative mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">
              {GATE_PRODUCT.kicker}
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{GATE_PRODUCT.title}</h1>
            <p className="max-w-xl text-sm leading-relaxed text-white/55">{GATE_PRODUCT.subtitle}</p>
          </div>
          <Link
            href="/nexus"
            className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            {GATE_PRODUCT.openExecution}
          </Link>
        </header>

        <GateLiveStats
          route={gateRoute}
          loading={gateRouteLoading}
          cmcLive={benchmarks.some((b) => b.cmcLive)}
        />

        <MeridianHowItWorks compact />

        {routeError && (
          <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p className="font-medium">{routeError}</p>
            <button type="button" className="mt-2 text-xs underline" onClick={() => void reload()}>
              Retry scan
            </button>
          </div>
        )}

        <GateBenchmarkDesk
          route={gateRoute}
          benchmarks={benchmarks}
          loading={gateRouteLoading}
          selected={symbol}
          onSelect={handleSelectSymbol}
          onDeploy={openInNexus}
        />

        <div id="gate-symbol-detail" className="space-y-5 scroll-mt-6">
        {selected?.skills && selected.gate && (
          <GateSkillStack
            skills={selected.skills as GateSkillsPayload}
            constitutionSignal={selected.gate.signal}
          />
        )}

        {selected?.fieldSources && (
          <GateDataProvenance sources={selected.fieldSources} oracle={selected.oracle} />
        )}

        {selected?.gate.checks && selected.gate.checks.length > 0 && (
          <GateCheckRadar
            checks={selected.gate.checks}
            confidence={selected.gate.confidence}
            edge={selected.gate.edge}
          />
        )}

        <GateStrategyLive
          symbol={symbol}
          loading={gateRouteLoading && !selected}
          error={null}
          gate={
            selected?.gate
              ? {
                  ...selected.gate,
                  signal: displaySignal,
                  thesis: selected.skills?.composite?.thesis ?? selected.gate.thesis ?? "",
                }
              : null
          }
          price={selected?.market.price}
          change24h={selected?.market.change24h}
          cmcLive={selected?.cmcLive}
          rsiSource={
            typeof selected?.fieldSources?.rsi === "string" ? selected.fieldSources.rsi : undefined
          }
          positionLabel={
            selected?.skills?.composite
              ? strategyPosition(selected.skills.composite.signal ?? selected.gate.signal)
              : undefined
          }
          onOpenNexus={() => openInNexus(symbol)}
        />

        </div>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <ArcIcon3d icon={BarChart3} theme="nexus" size="md" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{GATE_PRODUCT.backtestTitle}</p>
                  <h2 className="text-lg font-semibold">{GATE_PRODUCT.backtestSubtitle(symbol)}</h2>
                </div>
              </div>
              <button
                type="button"
                disabled={btLoading}
                onClick={() => void runBacktest(symbol)}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
              >
                {btLoading ? "Running…" : btRequested ? "Re-run" : "Run replay"}
              </button>
            </div>

            {btLoading && (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" /> Running replay…
              </div>
            )}

            {!btLoading && backtest?.ok && backtest.equityCurves && backtest.compare && (
              <div className="space-y-4">
                {backtest.note && (
                  <p className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/55">
                    {backtest.note}
                  </p>
                )}
                {underperformed && (
                  <p className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/65">
                    This window: rules returned {backtest.backtest!.totalReturnPct}% vs naive{" "}
                    {backtest.compare.naiveAgent.totalReturnPct}% — lower turnover (max DD{" "}
                    {backtest.backtest!.maxDrawdownPct}% vs {backtest.compare.naiveAgent.maxDrawdownPct}%).
                  </p>
                )}
                <GateEquityChart points={backtest.equityCurves} symbol={symbol} />
                <div className="grid gap-3 sm:grid-cols-4">
                  <Stat
                    label="Strategy return"
                    value={`${backtest.backtest!.totalReturnPct >= 0 ? "+" : ""}${backtest.backtest!.totalReturnPct}%`}
                  />
                  <Stat
                    label="Naive agent"
                    value={`${backtest.compare.naiveAgent.totalReturnPct >= 0 ? "+" : ""}${backtest.compare.naiveAgent.totalReturnPct}%`}
                  />
                  <Stat label="Max drawdown" value={`${backtest.backtest!.maxDrawdownPct}%`} />
                  <Stat label="Bars" value={String(backtest.bars)} sub={backtest.dataSource} />
                </div>
              </div>
            )}

            {!btLoading && backtest && !backtest.ok && (
              <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                <p className="font-medium">{backtest.error}</p>
                {backtest.hint && <p className="mt-1 text-xs text-amber-200/75">{backtest.hint}</p>}
              </div>
            )}

            {!btRequested && !btLoading && (
              <p className="text-xs text-white/35">Optional — validates the rule set on historical bars.</p>
            )}
          </div>
        </section>

        <footer className="flex flex-wrap items-center gap-4 text-xs text-white/40">
          <a
            href={`${GITHUB_SKILL}/STRATEGY_SPEC.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-white/70"
          >
            {GATE_PRODUCT.docs}
            <ExternalLink className="h-3 w-3" />
          </a>
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[10px] uppercase text-white/40">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
      {sub && <p className="truncate text-[9px] text-white/35">{sub}</p>}
    </div>
  );
}
