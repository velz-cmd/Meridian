"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Shield,
  ShieldBan,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { cn } from "@/lib/utils";
import { GATE_SKILL_REPO, GATE_SYMBOLS, type GateSymbol } from "@/lib/gate-constants";

type GateEvaluatePayload = {
  symbol: string;
  cmcLive: boolean;
  dataIntegrity: string;
  fieldSources: Record<string, string | number | null>;
  market: {
    price: number;
    change24h: number;
    change1h: number;
    fearGreed: number;
    rsi: number;
  };
  gate: {
    signal: string;
    regime?: string;
    checks: { id: string; pass: boolean; label: string }[];
    checksPassed: number;
    checksTotal: number;
    thesis: string;
  };
  permit: {
    status: "GRANT" | "DENY";
    blockReason?: string | null;
    agentRequested: string | null;
  };
  reproduce: { evaluate: string; backtest: string; cli: string };
};

type GateBacktestPayload = {
  ok: boolean;
  mode?: string;
  error?: string;
  hint?: string;
  symbol?: string;
  days?: number;
  bars?: number;
  dataSource?: string;
  backtest?: {
    totalReturnPct: number;
    maxDrawdownPct: number;
    winRatePct: number;
    roundTrips: number;
  };
  compare?: {
    constitution: { totalReturnPct: number; maxDrawdownPct: number };
    naiveAgent: { totalReturnPct: number; maxDrawdownPct: number };
    edge: { returnDeltaPct: number; drawdownSavedPct: number };
  };
  reproduce?: { api: string; cli: string };
};

export function GateConsole() {
  const [symbol, setSymbol] = useState<GateSymbol>("BNB");
  const [live, setLive] = useState<GateEvaluatePayload | null>(null);
  const [backtest, setBacktest] = useState<GateBacktestPayload | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [btLoading, setBtLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const loadLive = useCallback(async (sym: GateSymbol) => {
    setLiveLoading(true);
    try {
      const res = await fetch(
        `/api/gate/evaluate?symbol=${sym}&agentAction=BUY&confidence=92`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as GateEvaluatePayload & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Evaluate failed");
      setLive(data);
    } catch {
      setLive(null);
    } finally {
      setLiveLoading(false);
    }
  }, []);

  const loadBacktest = useCallback(async (sym: GateSymbol) => {
    setBtLoading(true);
    try {
      const res = await fetch(`/api/gate/backtest?symbol=${sym}&days=90`, { cache: "no-store" });
      const data = (await res.json()) as GateBacktestPayload;
      setBacktest(data);
    } catch {
      setBacktest({ ok: false, error: "Backtest request failed" });
    } finally {
      setBtLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLive(symbol);
    void loadBacktest(symbol);
  }, [symbol, loadLive, loadBacktest]);

  const copyText = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 2000);
  };

  const granted = live?.permit?.status === "GRANT";
  const failed = live?.gate?.checks.filter((c) => !c.pass) ?? [];
  const passed = live?.gate?.checks.filter((c) => c.pass) ?? [];

  return (
    <div className="relative min-h-screen text-white" data-gate-page>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_55%)]" />

      <div className="relative mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <header className="space-y-3 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300/80">
            BNB Hack · Track 2 · CoinMarketCap Strategy Skill
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">MERIDIAN Gate</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
            Pre-trade conviction gate for AI agents. Every field from CoinMarketCap — no synthetic
            backtest in live responses. BNB Smart Chain benchmarks only.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          {GATE_SYMBOLS.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => setSymbol(sym)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition",
                symbol === sym
                  ? "border-emerald-400/50 bg-emerald-500/20 text-white"
                  : "border-white/15 bg-white/5 text-white/60 hover:border-white/25 hover:text-white",
              )}
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Live gate */}
        <section className="arc-glass-card arc-glass-card-nexus overflow-hidden rounded-2xl border border-white/10">
          <div className="arc-panel-stripe arc-panel-stripe-nexus" />
          <div className="relative space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <ArcIcon3d icon={Shield} theme="nexus" size="md" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-emerald-300/80">Live gate · {symbol}</p>
                  <h2 className="text-xl font-semibold">
                    {liveLoading ? "Loading CMC data…" : granted ? "Permit GRANT" : "Permit DENY"}
                  </h2>
                  {live && !liveLoading && (
                    <p className="mt-1 text-sm text-white/65">{live.gate.thesis}</p>
                  )}
                </div>
              </div>
              {live?.permit && !liveLoading && (
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold",
                    granted
                      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-50"
                      : "border-rose-400/40 bg-rose-500/15 text-rose-50",
                  )}
                >
                  {granted ? <ShieldCheck className="h-4 w-4" /> : <ShieldBan className="h-4 w-4" />}
                  {live.permit.status}
                </span>
              )}
            </div>

            {liveLoading && (
              <div className="flex items-center gap-2 text-sm text-white/55">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching CoinMarketCap quotes…
              </div>
            )}

            {live && !liveLoading && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <Metric label="Price" value={`$${live.market.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
                  <Metric label="24h" value={`${live.market.change24h >= 0 ? "+" : ""}${live.market.change24h.toFixed(2)}%`} />
                  <Metric label="Fear & Greed" value={String(Math.round(live.market.fearGreed))} />
                  <Metric label="RSI" value={live.market.rsi.toFixed(1)} sub={String(live.fieldSources.rsi ?? "")} />
                </div>

                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
                    Gate checks · {live.gate.checksPassed}/{live.gate.checksTotal}
                    {live.gate.regime ? ` · ${live.gate.regime}` : ""}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {passed.map((c) => (
                      <CheckRow key={c.id} label={c.label} pass />
                    ))}
                    {failed.map((c) => (
                      <CheckRow key={c.id} label={c.label} pass={false} />
                    ))}
                  </div>
                </div>

                {live.permit.blockReason && (
                  <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {live.permit.blockReason}
                  </p>
                )}

                <p className="text-xs text-white/40">
                  Data: {live.dataIntegrity} · CMC live: {live.cmcLive ? "yes" : "no"}
                </p>
              </motion.div>
            )}
          </div>
        </section>

        {/* Backtest proof */}
        <section className="arc-glass-card overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <div className="relative space-y-4 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <ArcIcon3d icon={BarChart3} theme="nexus" size="md" />
              <div>
                <p className="text-xs uppercase tracking-wider text-cyan-300/80">Backtest proof</p>
                <h2 className="text-xl font-semibold">90-day CMC historical</h2>
                <p className="mt-1 text-sm text-white/55">
                  Real daily bars only — if unavailable, we show an honest error (no fixture fallback).
                </p>
              </div>
            </div>

            {btLoading && (
              <div className="flex items-center gap-2 text-sm text-white/55">
                <Loader2 className="h-4 w-4 animate-spin" />
                Running historical backtest…
              </div>
            )}

            {!btLoading && backtest?.ok && backtest.backtest && backtest.compare && (
              <div className="grid gap-4 sm:grid-cols-2">
                <BacktestCard
                  title="Constitution gate"
                  returnPct={backtest.backtest.totalReturnPct}
                  drawdownPct={backtest.backtest.maxDrawdownPct}
                  winRate={backtest.backtest.winRatePct}
                  trips={backtest.backtest.roundTrips}
                />
                <BacktestCard
                  title="Naive momentum agent"
                  returnPct={backtest.compare.naiveAgent.totalReturnPct}
                  drawdownPct={backtest.compare.naiveAgent.maxDrawdownPct}
                  highlight={false}
                />
                <div className="sm:col-span-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  Edge vs naive:{" "}
                  <strong>{backtest.compare.edge.returnDeltaPct >= 0 ? "+" : ""}{backtest.compare.edge.returnDeltaPct}%</strong> return ·{" "}
                  <strong>{backtest.compare.edge.drawdownSavedPct}%</strong> drawdown saved
                  <span className="mt-1 block text-xs text-emerald-200/70">
                    {backtest.bars} bars · {backtest.dataSource}
                  </span>
                </div>
              </div>
            )}

            {!btLoading && backtest && !backtest.ok && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                <p className="font-medium">{backtest.error ?? "Backtest unavailable"}</p>
                {backtest.hint && <p className="mt-2 text-xs text-amber-200/80">{backtest.hint}</p>}
                <p className="mt-2 text-xs text-white/45">
                  Reproduce locally: <code className="text-white/70">npm run bnb:backtest -- --symbol {symbol} --days 90</code>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Skill + reproduce */}
        <section className="arc-glass-card overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <div className="relative space-y-4 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <ArcIcon3d icon={BookOpen} theme="nexus" size="md" />
              <div>
                <p className="text-xs uppercase tracking-wider text-violet-300/80">CMC Strategy Skill</p>
                <h2 className="text-xl font-semibold">nexus-momentum-gate</h2>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={`${GATE_SKILL_REPO}/SKILL.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
              >
                SKILL.md <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={`${GATE_SKILL_REPO}/STRATEGY_SPEC.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
              >
                STRATEGY_SPEC.md <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {live?.reproduce && (
              <div className="space-y-2">
                {[
                  ["evaluate", live.reproduce.evaluate],
                  ["backtest", live.reproduce.backtest],
                ].map(([key, cmd]) => (
                  <div
                    key={key}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2"
                  >
                    <code className="min-w-0 flex-1 break-all text-[11px] text-white/70">{cmd}</code>
                    <button
                      type="button"
                      onClick={() => void copyText(key, cmd)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[10px] text-white/60 hover:text-white"
                    >
                      <Copy className="h-3 w-3" />
                      {copied === key ? "Copied" : "Copy"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="flex items-center gap-2 text-xs text-white/40">
              <Activity className="h-3 w-3" />
              Judges: verify live + backtest endpoints match CLI output — no synthetic series in API.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
      {sub && <p className="truncate text-[9px] text-white/35">{sub}</p>}
    </div>
  );
}

function CheckRow({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs",
        pass ? "border-emerald-400/20 bg-emerald-500/5 text-emerald-100/90" : "border-rose-400/25 bg-rose-500/5 text-rose-100/90",
      )}
    >
      {pass ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
      ) : (
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
      )}
      <span className="leading-snug">{label}</span>
    </div>
  );
}

function BacktestCard({
  title,
  returnPct,
  drawdownPct,
  winRate,
  trips,
  highlight = true,
}: {
  title: string;
  returnPct: number;
  drawdownPct: number;
  winRate?: number;
  trips?: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        highlight ? "border-cyan-400/25 bg-cyan-500/5" : "border-white/10 bg-black/30",
      )}
    >
      <p className="text-xs uppercase tracking-wider text-white/45">{title}</p>
      <p className="mt-2 text-2xl font-bold text-white">
        {returnPct >= 0 ? "+" : ""}
        {returnPct}%
      </p>
      <p className="text-sm text-white/55">Max drawdown {drawdownPct}%</p>
      {winRate != null && (
        <p className="text-xs text-white/40">
          Win rate {winRate}% · {trips} round trips
        </p>
      )}
    </div>
  );
}
