"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, ExternalLink, FileText, Loader2 } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { GATE_SKILL_REPO, GATE_SYMBOLS, type GateSymbol } from "@/lib/gate-constants";
import { GITHUB_SKILL, strategyPosition } from "@/lib/gate-strategy-copy";
import { GateStrategyLive } from "@/components/gate/gate-strategy-live";
import { GateStrategyBoard } from "@/components/gate/gate-strategy-board";
import { GateCheckRadar } from "@/components/gate/gate-check-radar";
import { GateSkillStack, type GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import { GateDataProvenance } from "@/components/gate/gate-data-provenance";
import { GateEquityChart } from "@/components/gate/gate-equity-chart";
import { GateCapitalRouter } from "@/components/gate/gate-capital-router";
import { useGateRoute } from "@/hooks/use-gate-route";

type GateCheck = { id: string; pass: boolean; weight: number; label: string };

type EvaluatePayload = {
  symbol: string;
  cmcLive?: boolean;
  fieldSources?: Record<string, string | number | null>;
  skills?: GateSkillsPayload;
  gate: {
    signal: string;
    tier: string;
    regime?: string;
    thesis: string;
    confidence?: number;
    edge?: number;
    checksPassed: number;
    checksTotal: number;
    checks?: GateCheck[];
  };
  market: { price: number; change24h: number; fearGreed?: number };
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
  const router = useRouter();
  const [symbol, setSymbol] = useState<GateSymbol>("BNB");
  const [live, setLive] = useState<EvaluatePayload | null>(null);
  const [backtest, setBacktest] = useState<BacktestPayload | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [btLoading, setBtLoading] = useState(true);
  const [fearGreed, setFearGreed] = useState<number | undefined>();
  const { route: gateRoute, benchmarks: board, loading: gateRouteLoading } = useGateRoute(45_000);
  const liveReq = useRef(0);
  const btReq = useRef(0);

  const loadLive = useCallback(async (sym: GateSymbol) => {
    const id = ++liveReq.current;
    setLiveLoading(true);
    setLiveError(null);
    try {
      const res = await fetch(`/api/gate/evaluate?symbol=${sym}`, { cache: "no-store" });
      const data = (await res.json()) as EvaluatePayload & { error?: string };
      if (id !== liveReq.current) return;
      if (res.ok && data.symbol?.toUpperCase() === sym) {
        setLive(data);
        if (data.market.fearGreed != null) setFearGreed(data.market.fearGreed);
      } else {
        setLive(null);
        setLiveError(data.error ?? `Strategy evaluation failed (${res.status})`);
      }
    } catch {
      if (id === liveReq.current) {
        setLive(null);
        setLiveError("Could not reach strategy API");
      }
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
    void loadLive(symbol);
    void loadBacktest(symbol);
  }, [symbol, loadLive, loadBacktest]);

  useEffect(() => {
    if (gateRoute?.fearGreed != null) setFearGreed(gateRoute.fearGreed);
  }, [gateRoute?.fearGreed]);

  const regime = live?.gate.regime ?? board.find((r) => r.symbol === symbol)?.gate.regime;
  const displaySignal = live?.skills?.composite?.signal ?? live?.gate.signal ?? "HOLD";
  const underperformed =
    backtest?.ok &&
    backtest.compare &&
    backtest.backtest &&
    backtest.backtest.totalReturnPct < backtest.compare.naiveAgent.totalReturnPct;

  const deployToNexus = useCallback(
    (sym: string) => {
      const row = gateRoute?.ranked.find((r) => r.symbol === sym);
      const permit = row?.permit === "GRANT" ? "GRANT" : "DENY";
      router.push(`/nexus?from=gate&symbol=${sym}&tab=trade&permit=${permit}`);
    },
    [gateRoute, router],
  );

  return (
    <div className="relative min-h-screen text-white" data-gate-page>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_50%)]" />

      <div className="relative mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
              CMC Strategy Skill · Track 2
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Strategy desk</h1>
            <p className="max-w-xl text-sm text-white/55">
              Live CMC quotes → 3 skills → constitution checks → capital router → NEXUS execution. Same engine judges
              replay via CLI.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <SpecChip href={`${GITHUB_SKILL}/SKILL.md`} label="SKILL.md" />
            <SpecChip href={`${GITHUB_SKILL}/STRATEGY_SPEC.md`} label="STRATEGY_SPEC" />
            <Link
              href="/nexus"
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1.5 text-emerald-100 hover:bg-emerald-500/25"
            >
              NEXUS desk →
            </Link>
          </div>
        </header>

        <GateCapitalRouter
          route={gateRoute}
          loading={gateRouteLoading}
          selectedSymbol={symbol}
          onSelectSymbol={(s) => setSymbol(s as GateSymbol)}
          onDeploy={deployToNexus}
        />

        <GateStrategyBoard
          rows={board.length ? board : live ? [{ symbol: live.symbol, gate: live.gate, market: live.market, skills: live.skills ? { alignmentScore: live.skills.composite?.alignmentScore, compositeSignal: live.skills.composite?.signal } : undefined }] : []}
          selected={symbol}
          onSelect={setSymbol}
          loading={gateRouteLoading}
          regime={regime}
          fearGreed={fearGreed}
        />

        {live?.skills && live.gate && (
          <GateSkillStack skills={live.skills} constitutionSignal={live.gate.signal} />
        )}

        {live?.fieldSources && <GateDataProvenance sources={live.fieldSources} />}

        {live?.gate.checks && live.gate.checks.length > 0 && (
          <GateCheckRadar checks={live.gate.checks} confidence={live.gate.confidence} edge={live.gate.edge} />
        )}

        <GateStrategyLive
          symbol={symbol}
          loading={liveLoading}
          error={liveError}
          gate={
            live?.gate
              ? {
                  ...live.gate,
                  signal: displaySignal,
                  thesis: live.skills?.composite?.thesis ?? live.gate.thesis,
                }
              : null
          }
          price={live?.market.price}
          change24h={live?.market.change24h}
          cmcLive={live?.cmcLive}
          rsiSource={
            typeof live?.fieldSources?.rsi === "string" ? live.fieldSources.rsi : undefined
          }
          positionLabel={
            live?.skills?.composite
              ? strategyPosition(live.skills.composite.signal)
              : undefined
          }
        />

        <section className="arc-glass-card overflow-hidden rounded-2xl border border-white/10">
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <ArcIcon3d icon={BarChart3} theme="nexus" size="md" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/85">Historical proof</p>
                <h2 className="text-lg font-semibold">90-day backtest · {symbol}</h2>
                <p className="text-sm text-white/55">
                  Honest replay — same rules, no look-ahead. Underperformance vs naive buy is shown when it happens.
                </p>
              </div>
            </div>

            {btLoading && (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" /> Running backtest…
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
                  <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    This window: constitution returned {backtest.backtest!.totalReturnPct}% vs naive{" "}
                    {backtest.compare.naiveAgent.totalReturnPct}% — strategy traded less (max DD{" "}
                    {backtest.backtest!.maxDrawdownPct}% vs {backtest.compare.naiveAgent.maxDrawdownPct}%). Risk filter,
                    not alpha guarantee.
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
          </div>
        </section>

        <footer className="flex flex-wrap gap-4 text-xs text-white/45">
          <Link href={GATE_SKILL_REPO.replace("/skills/nexus-momentum-gate", "")} className="hover:text-white">
            Engine on GitHub →
          </Link>
          <span>CLI: npm run bnb:backtest -- --symbol {symbol} --days 90</span>
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

function SpecChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-white/55 hover:text-white"
    >
      <FileText className="h-3 w-3" />
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
