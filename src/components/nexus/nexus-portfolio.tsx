"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ExternalLink, Loader2 } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { formatPct, formatUsd } from "@/lib/utils";
import { bscExplorerTx } from "@/lib/bsc-chain";
import { NexusTokenAvatar } from "@/components/nexus/nexus-token-avatar";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import type { DemoTradeRecord } from "@/lib/storage";
import type { MarkedPosition } from "@/lib/demo-trading";

const REFRESH_MS = 30_000;

export function NexusPortfolio({
  refreshKey,
  livePrices,
  feedTokens = [],
  showTxHistory = true,
}: {
  refreshKey?: number;
  livePrices?: Record<string, number>;
  feedTokens?: TrendingMarketToken[];
  /** Tx list only on Portfolio tab — not in Trade column */
  showTxHistory?: boolean;
}) {
  const { address } = useAccount();
  const [positions, setPositions] = useState<MarkedPosition[]>([]);
  const [trades, setTrades] = useState<DemoTradeRecord[]>([]);
  const [summary, setSummary] = useState<{
    totalValueUsd: number;
    unrealizedPnlUsd: number;
    realizedPnlUsd: number;
    totalPnlUsd: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const iconByAddr = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of feedTokens) {
      if (t.icon) m.set(t.tokenAddress.toLowerCase(), t.icon);
    }
    return m;
  }, [feedTokens]);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/nexus/demo/portfolio?wallet=${address}&t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        let pos = (data.positions ?? []) as MarkedPosition[];
        if (livePrices && Object.keys(livePrices).length > 0) {
          pos = pos.map((p) => {
            const key = p.tokenAddress.toLowerCase();
            const live = livePrices[key];
            if (!live || live <= 0) return p;
            const currentValueUsd = p.tokenAmount * live;
            const unrealizedPnlUsd = currentValueUsd - p.usdcSpent;
            return {
              ...p,
              markPriceUsd: live,
              currentValueUsd,
              unrealizedPnlUsd,
              unrealizedPnlPct: p.usdcSpent > 0 ? (unrealizedPnlUsd / p.usdcSpent) * 100 : 0,
            };
          });
          const totalValueUsd = pos.reduce((s, p) => s + p.currentValueUsd, 0);
          const totalSpentUsd = pos.reduce((s, p) => s + p.usdcSpent, 0);
          setSummary({
            totalValueUsd,
            unrealizedPnlUsd: totalValueUsd - totalSpentUsd,
            realizedPnlUsd: data.summary?.realizedPnlUsd ?? 0,
            totalPnlUsd: totalValueUsd - totalSpentUsd + (data.summary?.realizedPnlUsd ?? 0),
          });
        } else {
          setSummary(data.summary ?? null);
        }
        setPositions(pos);
        setTrades(data.trades ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [address, livePrices]);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load, refreshKey]);

  if (!address) {
    return (
      <p className="text-center text-xs text-white/45 py-4">Connect wallet (top right) to view portfolio.</p>
    );
  }

  return (
    <section className="nexus-section-card arc-glass-card arc-glass-card-nexus arc-border-trace space-y-3 rounded-2xl p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.portfolio} theme="nexus" size="sm" />
          <div>
            <p className="text-sm font-semibold text-white">
              Portfolio{positions.length ? ` · ${positions.length} holdings` : ""}
            </p>
            {summary && (
              <p className="text-[10px] text-white/45">
                {formatUsd(summary.totalValueUsd)} value · Total P&L{" "}
                <span className={summary.totalPnlUsd >= 0 ? "text-emerald-300" : "text-rose-300"}>
                  {formatUsd(summary.totalPnlUsd)}
                </span>
              </p>
            )}
          </div>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
      </div>

      {loading && positions.length === 0 ? (
        <p className="text-xs text-white/45">Loading holdings…</p>
      ) : positions.length === 0 ? (
        <p className="text-[11px] text-white/45">No open positions — buy from Trade to start tracking live P&L.</p>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <Stat label="Value" value={formatUsd(summary.totalValueUsd)} />
              <Stat
                label="Unrealized"
                value={formatUsd(summary.unrealizedPnlUsd)}
                positive={summary.unrealizedPnlUsd >= 0}
              />
              <Stat
                label="Realized"
                value={formatUsd(summary.realizedPnlUsd)}
                positive={summary.realizedPnlUsd >= 0}
              />
            </div>
          )}
          <div className="space-y-2">
            {positions.map((pos) => (
              <PositionRow
                key={pos.id}
                pos={pos}
                icon={pos.icon ?? iconByAddr.get(pos.tokenAddress.toLowerCase())}
              />
            ))}
          </div>
        </>
      )}

      {showTxHistory && trades.length > 0 && (
        <div className="border-t border-white/8 pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
            Transaction history
          </p>
          <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {trades.slice(0, 20).map((t) => {
              const isBuy = t.side === "buy";
              const icon = iconByAddr.get(t.tokenAddress.toLowerCase());
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
                    {t.usdcAmount > 0 && <span className="text-white/55"> · {formatUsd(t.usdcAmount)}</span>}
                    {t.pnlUsd != null && (
                      <span className={t.pnlUsd >= 0 ? " text-emerald-200" : " text-rose-200"}>
                        {" "}
                        P&L {formatUsd(t.pnlUsd)}
                      </span>
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

function PositionRow({ pos, icon }: { pos: MarkedPosition; icon?: string }) {
  const up = pos.unrealizedPnlUsd >= 0;
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-2.5 py-2.5">
      <div className="flex items-center gap-2.5">
        <NexusTokenAvatar symbol={pos.symbol} icon={icon} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{pos.symbol}</p>
          <p className="text-[10px] text-white/45">
            {pos.tokenAmount.toFixed(4)} tokens · entry {formatUsd(pos.avgEntryUsd)} · mark{" "}
            {formatUsd(pos.markPriceUsd)}
          </p>
          <p className="text-[10px] text-white/40">Cost {formatUsd(pos.usdcSpent)} · Value {formatUsd(pos.currentValueUsd)}</p>
        </div>
        <div className="text-right shrink-0">
          <p
            className={`flex items-center justify-end gap-0.5 text-sm font-bold ${up ? "text-emerald-300" : "text-rose-300"}`}
          >
            {up ? (
              <NEXUS_TRADE_ICONS.buy className="h-3.5 w-3.5" />
            ) : (
              <NEXUS_TRADE_ICONS.sell className="h-3.5 w-3.5" />
            )}
            {formatUsd(pos.unrealizedPnlUsd)}
          </p>
          <p className={`text-[10px] font-semibold ${up ? "text-emerald-300/90" : "text-rose-300/90"}`}>
            {formatPct(pos.unrealizedPnlPct)}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/6 bg-white/[0.02] px-2 py-1.5">
      <p className="text-[9px] uppercase text-white/35">{label}</p>
      <p
        className={`text-xs font-medium ${
          positive === undefined ? "text-white/80" : positive ? "text-emerald-300" : "text-rose-300"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
