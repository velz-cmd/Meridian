"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { GATE_SKILL_REPO, type GateSymbol } from "@/lib/gate-constants";
import { GateCapitalRouter, type CapitalRoutePayload } from "@/components/gate/gate-capital-router";
import { GatePermitArbitration } from "@/components/gate/gate-permit-arbitration";
import { GateEquityChart } from "@/components/gate/gate-equity-chart";
import { cn } from "@/lib/utils";

type EvaluatePayload = {
  symbol: string;
  cmcLive: boolean;
  market: { price: number; change24h: number; fearGreed: number; rsi: number };
  fieldSources: Record<string, string | number | null>;
  gate: {
    signal: string;
    regime?: string;
    checks: { id: string; pass: boolean; label: string }[];
    checksPassed: number;
    checksTotal: number;
    thesis: string;
  };
  permit: { status: "GRANT" | "DENY"; blockReason?: string | null };
  arbitration: {
    agent: { action: string; confidence: number };
    gate: { confidence: number; edge: number; signal: string; regime?: string };
    gap: number;
    vetoed: boolean;
    verdict: "GRANT" | "DENY";
    execute: string;
    permitId: string;
    narrative: string;
  };
};

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
  const [symbol, setSymbol] = useState<GateSymbol>("BNB");
  const [route, setRoute] = useState<CapitalRoutePayload | null>(null);
  const [live, setLive] = useState<EvaluatePayload | null>(null);
  const [backtest, setBacktest] = useState<BacktestPayload | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);
  const [liveLoading, setLiveLoading] = useState(true);
  const [btLoading, setBtLoading] = useState(true);
  const [auditOpen, setAuditOpen] = useState(false);
  const liveReq = useRef(0);
  const btReq = useRef(0);

  const loadRoute = useCallback(async () => {
    setRouteLoading(true);
    try {
      const res = await fetch("/api/gate/route", { cache: "no-store" });
      const data = (await res.json()) as CapitalRoutePayload;
      if (res.ok) setRoute(data);
    } catch {
      setRoute(null);
    } finally {
      setRouteLoading(false);
    }
  }, []);

  const loadLive = useCallback(async (sym: GateSymbol) => {
    const id = ++liveReq.current;
    setLiveLoading(true);
    try {
      const res = await fetch(`/api/gate/evaluate?symbol=${sym}&agentAction=BUY&confidence=92`, { cache: "no-store" });
      const data = (await res.json()) as EvaluatePayload;
      if (id !== liveReq.current) return;
      if (res.ok && data.symbol?.toUpperCase() === sym) setLive(data);
    } catch {
      if (id === liveReq.current) setLive(null);
    } finally {
      if (id === liveReq.current) setLiveLoading(false);
    }
  }, []);

  const loadBacktest = useCallback(async (sym: GateSymbol) => {
    const id = ++btReq.current;
    setBtLoading(true);
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

  useEffect(() => {
    void loadRoute();
  }, [loadRoute]);

  useEffect(() => {
    void loadLive(symbol);
    void loadBacktest(symbol);
  }, [symbol, loadLive, loadBacktest]);

  const liveReady = !liveLoading && live?.symbol?.toUpperCase() === symbol;
  const granted = live?.permit?.status === "GRANT";

  return (
    <div className="relative min-h-screen text-white" data-gate-page>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.14),_transparent_50%)]" />

      <div className="relative mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <header className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
            MERIDIAN · BSC Capital Router
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Where should your agent deploy on BSC?
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
            Not another coin screener. A constitution-backed router: rank BNB vs CAKE, issue GRANT/DENY permits,
            prove regime discipline on real CoinMarketCap history.
          </p>
        </header>

        <GateCapitalRouter
          data={route}
          loading={routeLoading}
          selected={symbol}
          onSelect={(s) => setSymbol(s as GateSymbol)}
        />

        {!liveLoading && liveReady && live?.arbitration && (
          <GatePermitArbitration symbol={symbol} arbitration={live.arbitration} granted={Boolean(granted)} />
        )}

        {liveLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading permit arbitration for {symbol}…
          </div>
        )}

        {liveReady && live && (
          <div className="rounded-xl border border-white/10 bg-black/25">
            <button
              type="button"
              onClick={() => setAuditOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white/70"
            >
              <span>CMC audit trail · {live.gate.checksPassed}/{live.gate.checksTotal} checks</span>
              <ChevronDown className={cn("h-4 w-4 transition", auditOpen && "rotate-180")} />
            </button>
            {auditOpen && (
              <div className="border-t border-white/10 px-4 pb-4 pt-2">
                <div className="mb-3 grid gap-2 sm:grid-cols-4">
                  <MiniMetric label="Price" value={`$${live.market.price.toFixed(2)}`} />
                  <MiniMetric label="24h" value={`${live.market.change24h.toFixed(2)}%`} />
                  <MiniMetric label="F&G" value={String(Math.round(live.market.fearGreed))} />
                  <MiniMetric label="RSI" value={live.market.rsi.toFixed(1)} />
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {live.gate.checks.map((c) => (
                    <p
                      key={c.id}
                      className={cn(
                        "rounded-lg px-2 py-1.5 text-xs",
                        c.pass ? "bg-emerald-500/10 text-emerald-100/85" : "bg-rose-500/10 text-rose-100/85",
                      )}
                    >
                      {c.pass ? "✓" : "✗"} {c.label}
                    </p>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-white/35">RSI source: {live.fieldSources.rsi}</p>
              </div>
            )}
          </div>
        )}

        <section className="arc-glass-card overflow-hidden rounded-2xl border border-white/10">
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <ArcIcon3d icon={BarChart3} theme="nexus" size="md" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/85">Regime proof</p>
                <h2 className="text-lg font-semibold">90-day constitution vs naive agent</h2>
                <p className="text-sm text-white/55">
                  Real daily bars — CMC historical when available; otherwise Binance spot closes (BSC venue).
                  Live router always uses CoinMarketCap.
                </p>
              </div>
            </div>

            {btLoading && (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading historical proof…
              </div>
            )}

            {!btLoading && backtest?.ok && backtest.equityCurves && backtest.compare && (
              <div className="space-y-4">
                {backtest.note && (
                  <p className="rounded-lg border border-cyan-400/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-100/85">
                    {backtest.note}
                  </p>
                )}
                <GateEquityChart points={backtest.equityCurves} symbol={symbol} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Gate return" value={`${backtest.backtest!.totalReturnPct >= 0 ? "+" : ""}${backtest.backtest!.totalReturnPct}%`} />
                  <Stat label="Drawdown saved" value={`${backtest.compare.edge.drawdownSavedPct}%`} />
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
          </div>
        </section>

        <footer className="flex flex-wrap gap-3 text-xs text-white/45">
          <a href={`${GATE_SKILL_REPO}/SKILL.md`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-white">
            CMC Skill <ExternalLink className="h-3 w-3" />
          </a>
          <Link href="/nexus" className="hover:text-white">
            NEXUS execution desk →
          </Link>
        </footer>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
      <p className="text-[9px] uppercase text-white/40">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
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
