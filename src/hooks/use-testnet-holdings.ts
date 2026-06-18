"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { useReadContracts } from "wagmi";
import { BSC_CHAIN_ID } from "@/lib/bsc-chain";
import { ERC20_ABI } from "@/lib/pancake-v2";
import { BSC_TESTNET_CATALOG, buildBscTestnetTradeTokens } from "@/lib/testnet-onchain";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

export type TestnetHolding = {
  symbol: string;
  name: string;
  tokenAddress: string;
  chainId: string;
  tokenAmount: number;
  markPriceUsd: number;
  currentValueUsd: number;
  icon?: string;
};

export function useTestnetHoldings(
  markPricesBySymbol: Record<string, number>,
  refreshKey = 0,
) {
  const { address } = useAccount();
  const { data: nativeBal, refetch: refetchNative } = useBalance({
    address,
    chainId: BSC_CHAIN_ID,
  });

  const contracts = useMemo(
    () =>
      BSC_TESTNET_CATALOG.map((row) => ({
        address: row.tokenAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf" as const,
        args: address ? ([address] as const) : undefined,
        chainId: BSC_CHAIN_ID,
      })),
    [address],
  );

  const decContracts = useMemo(
    () =>
      BSC_TESTNET_CATALOG.map((row) => ({
        address: row.tokenAddress,
        abi: ERC20_ABI,
        functionName: "decimals" as const,
        chainId: BSC_CHAIN_ID,
      })),
    [],
  );

  const { data: balances, refetch: refetchBal } = useReadContracts({
    contracts,
    query: { enabled: Boolean(address) },
  });

  const { data: decimals } = useReadContracts({
    contracts: decContracts,
    query: { enabled: Boolean(address) },
  });

  const deskMeta = useMemo(() => buildBscTestnetTradeTokens(), []);

  const holdings = useMemo((): TestnetHolding[] => {
    const rows: TestnetHolding[] = [];
    const nativeAmt = nativeBal ? Number(nativeBal.formatted) : 0;
    const bnbMark = markPricesBySymbol.BNB ?? markPricesBySymbol.TBNB ?? 0;
    if (nativeAmt > 0) {
      rows.push({
        symbol: "tBNB",
        name: "Testnet BNB",
        tokenAddress: "native",
        chainId: String(BSC_CHAIN_ID),
        tokenAmount: nativeAmt,
        markPriceUsd: bnbMark,
        currentValueUsd: nativeAmt * bnbMark,
        icon: deskMeta.find((t) => t.symbol === "BNB")?.icon,
      });
    }

    BSC_TESTNET_CATALOG.forEach((row, i) => {
      const raw = balances?.[i]?.result as bigint | undefined;
      const dec = Number(decimals?.[i]?.result ?? 18);
      if (raw == null || raw <= BigInt(0)) return;
      const amt = Number(formatUnits(raw, dec));
      const mark = markPricesBySymbol[row.symbol] ?? markPricesBySymbol[row.marketSymbol] ?? 0;
      const meta = deskMeta.find((t) => t.symbol === row.symbol);
      rows.push({
        symbol: row.symbol,
        name: row.name,
        tokenAddress: row.tokenAddress,
        chainId: String(BSC_CHAIN_ID),
        tokenAmount: amt,
        markPriceUsd: mark,
        currentValueUsd: mark > 0 ? amt * mark : 0,
        icon: meta?.icon ?? row.icon,
      });
    });

    return rows.sort((a, b) => b.currentValueUsd - a.currentValueUsd);
  }, [nativeBal, balances, decimals, markPricesBySymbol, deskMeta]);

  const refetch = useCallback(() => {
    void refetchNative();
    void refetchBal();
  }, [refetchNative, refetchBal]);

  useEffect(() => {
    refetch();
  }, [refreshKey, refetch]);

  const summary = useMemo(() => {
    const totalValueUsd = holdings.reduce((s, h) => s + h.currentValueUsd, 0);
    return { totalValueUsd, count: holdings.length };
  }, [holdings]);

  return { holdings, summary, refetch, connected: Boolean(address) };
}

export function markPricesFromFeed(feedTokens: TrendingMarketToken[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of feedTokens) {
    const sym = t.symbol.replace(/^\$/, "").trim().toUpperCase();
    if (t.priceUsd > 0) map[sym] = t.priceUsd;
  }
  return map;
}
