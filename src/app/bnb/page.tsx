"use client";

import { useCallback, useState } from "react";

type GateCheck = { id: string; label: string; pass: boolean; weight: number };

type DemoPayload = {
  mode: string;
  symbol: string;
  strategy: string;
  evalNow: {
    signal: string;
    tier: string;
    confidence: number;
    risk: number;
    agreement: number;
    checks: GateCheck[];
    thesis: string;
    agentDirective: string;
  };
  backtest: {
    totalReturnPct: number;
    maxDrawdownPct: number;
    winRatePct: number;
    roundTrips: number;
    trades: number;
    bars: number;
  };
};

export default function BnbHackDemoPage() {
  const [data, setData] = useState<DemoPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDemo = useCallback(async (live = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = live ? "/api/bnb/demo?live=1&symbol=BNB" : "/api/bnb/demo";
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const ev = data?.evalNow;
  const bt = data?.backtest;

  return (
    <div className="min-h-screen bg-[#06080f] text-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs uppercase tracking-widest text-amber-400/90">BNB Hack · Track 2</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">NEXUS Momentum Gate</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Agent-grade pre-trade conviction system — clamps BUY signals to rare ENTER_LONG events.
          Powered by CoinMarketCap MCP fields; backtestable spec in{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-300">bnb-hack/</code>.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => runDemo(false)}
            disabled={loading}
            className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5 disabled:opacity-50"
          >
            {loading ? "Running…" : "Offline demo"}
          </button>
          <button
            type="button"
            onClick={() => runDemo(true)}
            disabled={loading}
            className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-black transition hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "Running…" : "Live CMC gate (BNB)"}
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        {ev && bt && (
          <div className="mt-8 space-y-6">
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-lg font-medium">Live gate · {data?.symbol}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Metric label="Signal" value={ev.signal} highlight />
                <Metric label="Tier" value={ev.tier} />
                <Metric label="Confidence" value={`${ev.confidence}`} />
                <Metric label="Risk" value={`${ev.risk}`} />
              </div>
              <p className="mt-4 text-sm text-zinc-300">{ev.thesis}</p>
              <p className="mt-2 text-xs text-amber-200/80">{ev.agentDirective}</p>
              <ul className="mt-4 space-y-1.5">
                {ev.checks.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm">
                    <span className={c.pass ? "text-emerald-400" : "text-red-400"}>{c.pass ? "✓" : "✗"}</span>
                    <span className="text-zinc-400">{c.label}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-lg font-medium">Backtest metrics ({data?.mode})</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <Metric label="Total return" value={`${bt.totalReturnPct}%`} highlight />
                <Metric label="Max drawdown" value={`${bt.maxDrawdownPct}%`} />
                <Metric label="Win rate" value={`${bt.winRatePct}%`} />
                <Metric label="Round trips" value={`${bt.roundTrips}`} />
                <Metric label="Trades" value={`${bt.trades}`} />
                <Metric label="Bars" value={`${bt.bars}`} />
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
              <h2 className="text-base font-medium text-white">Judge quick commands</h2>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-black/40 p-4 text-xs text-zinc-300">
{`npm run bnb:smoke
npm run bnb:backtest
npm run bnb:evaluate

# With CMC Pro key (PowerShell):
$env:CMC_API_KEY="your_key"
node bnb-hack/backtest/run.mjs --symbol BNB --days 90`}
              </pre>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-black/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-0.5 font-mono text-base ${highlight ? "text-amber-400" : "text-zinc-200"}`}>{value}</p>
    </div>
  );
}
