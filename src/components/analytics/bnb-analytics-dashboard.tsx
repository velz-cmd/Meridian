"use client";

import {
  Activity,
  BarChart3,
  ExternalLink,
  Eye,
  Loader2,
  RefreshCw,
  Scale,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { ArcBackground } from "@/components/layout/arc-background";
import { MeridianFooter } from "@/components/layout/meridian-footer";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { useBnbAnalytics } from "@/hooks/use-bnb-analytics";
import { trackMeridianEvent } from "@/lib/product-analytics-client";
import { bscExplorerAddress, bscExplorerTxIfValid } from "@/lib/bsc-chain";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  sub,
  accent = "text-white",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/35 px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", accent)}>{value}</p>
      {sub && <p className="mt-1 text-[11px] leading-snug text-white/45">{sub}</p>}
    </div>
  );
}

function formatMetricKey(key: string): string {
  return key.replace(/_/g, " ");
}

function kindLabel(kind: string): string {
  return kind.replace(/^api_/, "API · ").replace(/_/g, " ");
}

export function BnbAnalyticsDashboard() {
  const { data, loading, error, reload } = useBnbAnalytics(30_000);
  const product = data?.product;

  const duneMetrics = Object.entries(data?.dune.metrics ?? {}).slice(0, 8);
  const refreshed = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  const maxHour = Math.max(1, ...(product?.hourlyPageViews.map((h) => h.count) ?? [1]));

  const handleRefresh = () => {
    trackMeridianEvent({ kind: "analytics_refresh", path: "/analytics" });
    void reload();
  };

  return (
    <div className="relative min-h-screen text-white" data-arc-theme="nexus">
      <ArcBackground theme="nexus" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <ArcIcon3d icon={BarChart3} theme="nexus" size="sm" />
              <p className="arc-caption text-cyan-300/85">BNB Hack · Live traction</p>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              MERIDIAN <span className="text-white/55">analytics</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/55">
              Real product traction on trader-arc.vercel.app — unique visitors, page views, user actions, and
              API usage. Auto-refreshes every 30s.
            </p>
            <p className="mt-1 font-mono text-[10px] text-emerald-400/80">
              Live · storage {product?.storage ?? "—"} · last sync {refreshed}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-white/80 hover:border-cyan-400/35"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
            <Link
              href="/gate"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100"
            >
              <Scale className="h-4 w-4" />
              Strategy desk
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <p className="mb-4 font-mono text-[10px] text-white/35">Live product metrics · updates every 30s</p>

        {/* ── Live product traction ── */}
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold">Live product traction</h2>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] text-emerald-300">
              REAL USERS
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Unique visitors (24h)"
              value={loading ? "…" : String(product?.visitors24h ?? 0)}
              sub={`${product?.visitors7d ?? 0} this week · ${product?.activeVisitors1h ?? 0} active last hour`}
              accent="text-cyan-200"
            />
            <StatCard
              label="Page views (24h)"
              value={loading ? "…" : String(product?.pageViews24h ?? 0)}
              sub={`${product?.pageViews7d ?? 0} views · 7 days · ${product?.sessions24h ?? 0} sessions`}
              accent="text-violet-200"
            />
            <StatCard
              label="User actions (24h)"
              value={loading ? "…" : String(product?.actions24h ?? 0)}
              sub="Symbol picks, trades, API scans"
              accent="text-amber-200"
            />
            <StatCard
              label="Connected wallets trading"
              value={loading ? "…" : String(product?.derived.demoWallets ?? 0)}
              sub={`${product?.derived.totalDemoTrades ?? 0} Chapel swaps recorded`}
              accent="text-emerald-200"
            />
          </div>
        </section>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-white/10 bg-black/30 p-4 lg:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold">Top pages (24h)</h2>
            </div>
            {!product?.topPages.length ? (
              <p className="text-xs text-white/45">No page views yet — browse /gate or /nexus to populate.</p>
            ) : (
              <ul className="space-y-2">
                {product.topPages.map((p) => (
                  <li key={p.path} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-white/75">{p.path}</span>
                    <span className="tabular-nums text-white/45">{p.views}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/30 p-4 lg:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold">Top actions (7d)</h2>
            </div>
            {!product?.topActions.length ? (
              <p className="text-xs text-white/45">Actions appear when users pick tokens, run gate API, or swap.</p>
            ) : (
              <ul className="space-y-2">
                {product.topActions.map((a) => (
                  <li key={a.kind} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-white/75">{kindLabel(a.kind)}</span>
                    <span className="tabular-nums text-white/45">{a.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/30 p-4 lg:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-semibold">Page views · last 24h</h2>
            </div>
            <div className="flex h-24 items-end gap-0.5">
              {(product?.hourlyPageViews ?? []).map((h) => (
                <div
                  key={h.hour}
                  className="flex-1 rounded-t bg-cyan-500/40 transition-all"
                  style={{ height: `${Math.max(4, (h.count / maxHour) * 100)}%` }}
                  title={`${h.hour}: ${h.count}`}
                />
              ))}
            </div>
            <p className="mt-2 font-mono text-[9px] text-white/35">Hourly buckets · hover bars for count</p>
          </section>
        </div>

        <section className="mb-6 rounded-2xl border border-cyan-400/15 bg-cyan-500/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-semibold">Live activity feed</h2>
          </div>
          {!product?.recent.length ? (
            <p className="text-xs text-white/45">Waiting for first events…</p>
          ) : (
            <ul className="max-h-56 space-y-1.5 overflow-y-auto">
              {product.recent.map((ev, i) => (
                <li
                  key={`${ev.at}-${i}`}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-1.5 text-[11px]"
                >
                  <span className="font-mono text-white/35">
                    {new Date(ev.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <span className="font-medium capitalize text-cyan-200/90">{kindLabel(ev.kind)}</span>
                  {ev.path && <span className="font-mono text-white/50">{ev.path}</span>}
                  {ev.symbol && <span className="text-amber-200/80">{ev.symbol}</span>}
                  {ev.action && <span className="text-white/40">{ev.action}</span>}
                  <span className="ml-auto font-mono text-white/25">{ev.visitorShort}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Scale className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold">Strategy desk · gate engine</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Gate feed"
            value={loading ? "…" : data?.gate.cmcLive ? "CMC live" : data?.gate.degraded ? "Venue" : "Cached"}
            sub={`${data?.gate.permitsClear ?? 0} / ${data?.gate.benchmarks ?? 4} cleared · ${data?.gate.regime ?? "—"}`}
            accent={data?.gate.cmcLive ? "text-emerald-300" : "text-amber-300"}
          />
          <StatCard
            label="Chapel trades"
            value={loading ? "…" : String(data?.execution.totalTrades ?? 0)}
            sub={`${data?.execution.uniqueWallets ?? 0} wallets · ${data?.execution.tradesLast24h ?? 0} last 24h`}
            accent="text-cyan-200"
          />
          <StatCard
            label="Vault activity"
            value={
              loading
                ? "…"
                : data?.onChain.vaultTxCount != null
                  ? String(data.onChain.vaultTxCount)
                  : "—"
            }
            sub={
              data?.onChain.vaultBalanceTbnb != null
                ? `${data.onChain.vaultBalanceTbnb.toFixed(4)} tBNB in vault`
                : "Agent vault on BSC Testnet"
            }
            accent="text-violet-200"
          />
          <StatCard
            label="Router pick"
            value={loading ? "…" : (data?.gate.primary ?? "FLAT")}
            sub={`Fear & Greed ${data?.gate.fearGreed ?? 50} · BNB CAKE FLOKI XVS`}
            accent="text-white"
          />
          </div>
        </section>

        {(data?.dune.dashboardUrl || data?.dune.embedUrl || duneMetrics.length > 0) && (
          <section className="mb-6 rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-semibold">Dune on-chain analytics</h2>
              </div>
              {data?.dune.dashboardUrl && (
                <a
                  href={data.dune.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-cyan-300 underline-offset-2 hover:underline"
                >
                  Open public dashboard <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {data?.dune.embedUrl && (
              <div className="mb-4 overflow-hidden rounded-xl border border-white/10">
                <iframe
                  title="MERIDIAN Dune dashboard"
                  src={data.dune.embedUrl}
                  className="h-[360px] w-full bg-black/50"
                  loading="lazy"
                />
              </div>
            )}

            {duneMetrics.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {duneMetrics.map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2">
                    <p className="text-[9px] uppercase tracking-wider text-white/35">{formatMetricKey(k)}</p>
                    <p className="mt-0.5 font-mono text-sm text-white/85">{String(v ?? "—")}</p>
                  </div>
                ))}
              </div>
            ) : (
            <p className="text-xs text-white/45">
              {data?.dune.configured
                ? "BSC mainnet CAKE/BNB dex.trades (Dune has no Chapel testnet catalog) — Chapel demo txs on /analytics on-chain scan."
                : "Set DUNE_API_KEY + dashboard URL on Vercel for SQL-backed traction."}
            </p>
            )}
          </section>
        )}

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold">Recent Chapel trades</h2>
            </div>
            {!data?.execution.recent.length ? (
              <p className="text-xs text-white/45">No recorded testnet swaps yet — connect wallet on NEXUS and run a gate-cleared swap.</p>
            ) : (
              <ul className="space-y-2">
                {data.execution.recent.map((t, i) => {
                  const txUrl = t.txHash ? bscExplorerTxIfValid(t.txHash) : null;
                  return (
                    <li
                      key={`${t.at}-${i}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs"
                    >
                      <span>
                        <span className="font-bold text-white">{t.symbol}</span>
                        <span className="text-white/40"> · {t.side.toUpperCase()}</span>
                      </span>
                      <span className="font-mono text-white/40">
                        {new Date(t.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {txUrl && (
                        <a href={txUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                          tx
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold">On-chain scan (BSC Testnet)</h2>
            </div>
            {data?.onChain.vaultAddress ? (
              <p className="mb-3 font-mono text-[10px] text-white/50">
                Vault{" "}
                <a
                  href={bscExplorerAddress(data.onChain.vaultAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  {data.onChain.vaultAddress.slice(0, 10)}…{data.onChain.vaultAddress.slice(-6)}
                </a>
                · scanned {data.onChain.scannedBlocks.toLocaleString()} blocks
              </p>
            ) : null}
            {!data?.onChain.recentActivity.length ? (
              <p className="text-xs text-white/45">Scanning PancakeSwap router + vault — no recent matches in window.</p>
            ) : (
              <ul className="space-y-2">
                {data.onChain.recentActivity.slice(0, 8).map((tx) => (
                  <li key={tx.hash} className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-cyan-400 hover:underline">
                        {tx.hash.slice(0, 10)}…
                      </a>
                      <span className="text-white/40">{tx.valueTbnb.toFixed(4)} tBNB</span>
                    </div>
                    {tx.isPancakeRouter && (
                      <p className="mt-1 text-[10px] text-emerald-400/80">PancakeSwap V2 router</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <h2 className="mb-3 text-sm font-semibold">Platform & reproduce</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="NEXUS decisions"
              value={data?.platform.nexusDecisions != null ? String(data.platform.nexusDecisions) : "—"}
              sub={data?.platform.supabaseConfigured ? "Supabase persisted" : "Local / ephemeral"}
            />
            <StatCard
              label="PRISM forecasts"
              value={data?.platform.prismPredictions != null ? String(data.platform.prismPredictions) : "—"}
              sub="Macro oracle runs"
            />
            <StatCard
              label="BSC swaps"
              value={String(data?.execution.bscTestnetTrades ?? 0)}
              sub={`${data?.execution.buyCount ?? 0} buy · ${data?.execution.sellCount ?? 0} sell`}
            />
            <StatCard
              label="Dune queries"
              value={String(data?.dune.queryIds.length ?? 0)}
              sub={data?.dune.configured ? "API connected" : "Not configured"}
            />
          </div>
          <div className="mt-4 space-y-1 font-mono text-[10px] text-white/45">
            <p>GET {data?.api.analytics ?? "/api/bnb/analytics"}</p>
            <p>GET {data?.api.evaluate ?? "/api/gate/evaluate?symbol=BNB"}</p>
            <p>GET {data?.api.backtest ?? "/api/gate/backtest?symbol=BNB&days=90"}</p>
          </div>
        </section>

        <MeridianFooter className="mt-10" />
      </div>
    </div>
  );
}
