"use client";

import { useEffect, useMemo, useState } from "react";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { isBscNativeBnb } from "@/lib/arc-usdc-swap";
import { BSC_MARKET_CHAIN_SLUG } from "@/lib/bsc-chain";
import { isBscTestnetChainId } from "@/lib/testnet-onchain";

/** Refresh USD quotes — testnet tokens use mainnet BSC market prices for display. */
export function useSwapTokenQuotes(tokens: TrendingMarketToken[], bnbSpotUsd: number) {
  const [quotes, setQuotes] = useState<Record<string, Partial<TrendingMarketToken>>>({});

  const keys = useMemo(
    () =>
      tokens
        .filter((t) => t.tokenAddress && t.chainId && !isBscNativeBnb(t.tokenAddress))
        .map((t) => `${t.chainId}:${t.tokenAddress.toLowerCase()}`)
        .sort()
        .join("|"),
    [tokens],
  );

  useEffect(() => {
    if (!keys) return;
    let cancelled = false;

    async function refresh() {
      const need = tokens.filter(
        (t) =>
          t.tokenAddress &&
          t.chainId &&
          !isBscNativeBnb(t.tokenAddress) &&
          (t.priceUsd <= 0 || !t.pairAddress),
      );
      const batch = need.slice(0, 12);
      const next: Record<string, Partial<TrendingMarketToken>> = {};

      await Promise.all(
        batch.map(async (t) => {
          try {
            const k = `${t.chainId}:${t.tokenAddress.toLowerCase()}`;

            if (isBscTestnetChainId(t.chainId)) {
              const res = await fetch(
                `/api/nexus/token/search?q=${encodeURIComponent(t.symbol)}&chainId=${BSC_MARKET_CHAIN_SLUG}`,
                { cache: "no-store" },
              );
              const data = await res.json();
              const row = (data.results ?? []).find(
                (r: { symbol?: string }) =>
                  r.symbol?.toUpperCase() === t.symbol.toUpperCase(),
              );
              if (row?.priceUsd > 0) {
                next[k] = {
                  priceUsd: row.priceUsd,
                  change24h: row.change24h ?? t.change24h,
                  volume24h: row.volume24h ?? t.volume24h,
                  liquidityUsd: row.liquidityUsd ?? t.liquidityUsd,
                  marketCap: row.marketCap ?? t.marketCap,
                  pairAddress: row.pairAddress ?? t.pairAddress,
                  url: row.url ?? t.url,
                  icon: row.icon ?? t.icon,
                };
              }
              return;
            }

            const params = new URLSearchParams({
              chainId: t.chainId,
              address: t.tokenAddress,
            });
            const res = await fetch(`/api/nexus/pair?${params}`, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok || !(data.priceUsd > 0)) return;
            next[k] = {
              priceUsd: data.priceUsd,
              change24h: data.change24h ?? t.change24h,
              volume24h: data.volume24h ?? t.volume24h,
              liquidityUsd: data.liquidityUsd ?? t.liquidityUsd,
              marketCap: data.marketCap ?? t.marketCap,
              pairAddress: data.pairAddress ?? t.pairAddress,
              url: data.url ?? t.url,
              icon: data.icon ?? t.icon,
            };
          } catch {
            /* skip */
          }
        }),
      );

      if (!cancelled && Object.keys(next).length > 0) {
        setQuotes((prev) => ({ ...prev, ...next }));
      }
    }

    void refresh();
    const t = setInterval(refresh, 25_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [keys, tokens]);

  const merged = useMemo(() => {
    return tokens.map((t) => {
      if (isBscNativeBnb(t.tokenAddress)) {
        return { ...t, priceUsd: bnbSpotUsd, symbol: "BNB", name: "BSC Testnet tBNB" };
      }
      const k = `${t.chainId}:${t.tokenAddress.toLowerCase()}`;
      const q = quotes[k];
      return q ? { ...t, ...q } : t;
    });
  }, [tokens, quotes, bnbSpotUsd]);

  return merged;
}
