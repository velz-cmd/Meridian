"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ExternalLink, Loader2 } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { formatTokenPrice, formatUsd } from "@/lib/utils";
import { bscExplorerTx } from "@/lib/bsc-chain";
import { NexusTokenAvatar } from "@/components/nexus/nexus-token-avatar";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import type { DemoTradeRecord } from "@/lib/storage";
import {
  markPricesFromFeed,
  useTestnetHoldings,
  type TestnetHolding,
} from "@/hooks/use-testnet-holdings";
import { BSC_TESTNET_CATALOG } from "@/lib/testnet-onchain";

const REFRESH_MS = 20_000;

const DESK_ADDRS = new Set(
  BSC_TESTNET_CATALOG.map((r) => r.tokenAddress.toLowerCase()),
);

export function NexusPortfolio({
  refreshKey,
  livePrices,
  feedTokens = [],
  showTxHistory = true,
}: {
  refreshKey?: number;
  livePrices?: Record<string, number>;
  feedTokens?: TrendingMarketToken[];
  showTxHistory?: boolean;
}) {
  const { address } = useAccount();
  const markBySymbol = useMemo(
    () => ({ ...markPricesFromFeed(feedTokens), ...(livePrices ?? {}) }),
    [feedTokens, livePrices],
  );
  const { holdings, summary, refetch, connected } = useTestnetHoldings(
    markBySymbol,
    refreshKey,
  );

  const [trades, setTrades] = useState<DemoTradeRecord[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);

  const iconBySymbol = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of feedTokens) {
      const sym = t.symbol.replace(/^\$/, "").trim().toUpperCase();
      if (t.icon) m.set(sym, t.icon);
    }
    return m;
  }, [feedTokens]);

  const loadTrades = useCallback(async () => {
    if (!address) return;
    setLoadingTrades(true);
    try {
      const res = await fetch(`/api/nexus/demo/portfolio?wallet=${address}&t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        const all = (data.trades ?? []) as DemoTradeRecord[];
        setTrades(
          all.filter(
            (t) =>
              DESK_ADDRS.has(t.tokenAddress.toLowerCase()) ||
              t.symbol.toUpperCase() === "CAKE" ||
              t.symbol.toUpperCase() === "BNB",
          ),
        );
      }
    } finally {
      setLoadingTrades(false);
    }
  }, [address]);

  useEffect(() => {
    loadTrades();
    const interval = setInterval(loadTrades, REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadTrades, refreshKey]);

  useEffect(() => {
    refetch();
  }, [refreshKey, refetch]);

  if (!connected) {
    return (
      <p className="text-center text-xs text-white/45 py-4">Connect wallet (top right) to view portfolio.</p>
    );
  }

  const loading = loadingTrades && holdings.length === 0;

  return (
    <section className="nexus-section-card arc-glass-card arc-glass-card-nexus arc-border-trace space-y-3 rounded-2xl p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.portfolio} theme="nexus" size="sm" />
          <div>
            <p className="text-sm font-semibold text-white">
              Portfolio
              {summary.count ? ` · ${summary.count} on-chain` : ""}
            </p>
            <p className="text-[10px] text-white/45">
              BSC Testnet wallet · marked with live feed prices
            </p>
          </div>
        </div>
        {(loading || loadingTrades) && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
      </div>

      {summary.count > 0 && (
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <Stat label="Total value" value={formatUsd(summary.totalValueUsd)} />
          <Stat label="Holdings" value={String(summary.count)} />
        </div>
      )}

      {loading && holdings.length === 0 ? (
        <p className="text-xs text-white/45">Loading on-chain balances…</p>
      ) : holdings.length === 0 ? (
        <p className="text-[11px] text-white/45">
          No desk tokens yet — buy CAKE or BUSD from Trade after constitution clears.
        </p>
      ) : (
        <div className="space-y-2">
          {holdings.map((h) => (
            <HoldingRow
              key={h.tokenAddress}
              holding={h}
              icon={h.icon ?? iconBySymbol.get(h.symbol.replace(/^\$/, "").trim().toUpperCase())}
            />
          ))}
        </div>
      )}

      {showTxHistory && trades.length > 0 && (
        <div className="border-t border-white/8 pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
            On-chain history
          </p>
          <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {trades.slice(0, 20).map((t) => {
              const isBuy = t.side === "buy";
              const sym = t.symbol.replace(/^\$/, "").trim().toUpperCase();
              const icon = iconBySymbol.get(sym);
              const ts = new Date(t.timestamp).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[10px] ${
                    isBuy
                      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                      : "border-rose-400/25 bg-rose-500/10 text-rose-100"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <NexusTokenAvatar symbol={t.symbol} icon={icon} size="sm" className="!h-8 !w-8" />
                    <div className="min-w-0">
                      <span className="font-bold">{isBuy ? "BUY" : "SELL"}</span>{" "}
                      <span className="font-semibold">{t.symbol}</span>
                      {t.tokenAmount > 0 && (
                        <span className="text-white/55"> · {t.tokenAmount.toFixed(4)}</span>
                      )}
                      {t.usdcAmount > 0 && (
                        <span className="text-white/55"> · {formatUsd(t.usdcAmount)}</span>
                      )}
                      <p className="text-white/35">{ts}</p>
                    </div>
                  </div>
                  {t.arcFeeTxHash && (
                    <a
                      href={bscExplorerTx(t.arcFeeTxHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 inline-flex items-center gap-0.5 text-cyan-300 hover:underline"
                    >
                      Tx <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function HoldingRow({ holding, icon }: { holding: TestnetHolding; icon?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-2.5 py-2.5">
      <div className="flex items-center gap-2.5">
        <NexusTokenAvatar symbol={holding.symbol} icon={icon} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{holding.symbol}</p>
          <p className="text-[10px] text-white/45">
            {holding.tokenAmount.toFixed(4)} · mark {formatTokenPrice(holding.markPriceUsd)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-white">{formatUsd(holding.currentValueUsd)}</p>
          <p className="text-[10px] text-white/40">on-chain</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/6 bg-white/[0.02] px-2 py-1.5">
      <p className="text-[9px] uppercase text-white/35">{label}</p>
      <p className="text-xs font-medium text-white/80">{value}</p>
    </div>
  );
}
