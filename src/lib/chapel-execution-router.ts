/**
 * Chapel execution router — maps gate / feed symbols to swappable BSC Testnet desk tokens.
 * FLOKI & XVS are not deployed on Chapel; we route to the closest BSC desk proxy with clear labeling.
 */
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { BSC_CHAIN_LABEL } from "@/lib/bsc-chain";
import { isGateSymbol } from "@/lib/gate-constants";
import { mergeGateBenchmarkRow, overlayGateMarketOnDesk } from "@/lib/gate-benchmark-token";
import {
  canSwapOnBscTestnet,
  isTestnetDeskToken,
  matchTestnetDeskBySymbol,
} from "@/lib/testnet-onchain";

function norm(symbol: string): string {
  return symbol.replace(/^\$/, "").trim().toUpperCase();
}

/** Gate symbols without native Chapel pools → desk proxy for on-chain execution. */
export const CHAPEL_GATE_PROXY: Record<string, string> = {
  FLOKI: "CAKE",
  XVS: "BNB",
};

export function chapelProxySymbol(symbol: string): string | null {
  const sym = norm(symbol);
  if (sym === "BNB" || sym === "TBNB" || sym === "WBNB" || sym === "CAKE" || sym === "BUSD" || sym === "USDC") {
    return sym === "TBNB" || sym === "WBNB" ? "BNB" : sym;
  }
  return CHAPEL_GATE_PROXY[sym] ?? null;
}

/** True when Chapel can settle this symbol (direct desk or routed gate proxy). */
export function hasChapelExecutionRoute(symbol: string): boolean {
  const sym = norm(symbol);
  const proxy = chapelProxySymbol(sym);
  if (!proxy) return false;
  if (isGateSymbol(sym)) return true;
  const desk = matchTestnetDeskBySymbol(proxy, 0);
  return desk != null && canSwapOnBscTestnet(desk);
}

export type ChapelExecutionRoute = {
  /** Feed / gate row the user is analyzing */
  display: TrendingMarketToken;
  /** Token to pass to PancakeSwap (Chapel chain 97) */
  swap: TrendingMarketToken | null;
  /** User clicked FLOKI but we swap CAKE, etc. */
  routed: boolean;
  analysisSymbol: string;
  chapelSymbol: string;
  routeNote: string | null;
};

export function resolveChapelExecution(
  selected: TrendingMarketToken | null,
  bnbSpotUsd = 0,
): ChapelExecutionRoute | null {
  if (!selected) return null;

  const analysisSymbol = norm(selected.symbol);
  const chapelSymbol = chapelProxySymbol(analysisSymbol) ?? analysisSymbol;
  const routed = chapelSymbol !== analysisSymbol;

  if (!chapelProxySymbol(analysisSymbol) && !isTestnetDeskToken(selected) && !canSwapOnBscTestnet(selected)) {
    return {
      display: selected,
      swap: null,
      routed: false,
      analysisSymbol,
      chapelSymbol,
      routeNote: null,
    };
  }

  const desk = isTestnetDeskToken(selected)
    ? selected
    : matchTestnetDeskBySymbol(chapelSymbol, bnbSpotUsd);

  if (!desk || !canSwapOnBscTestnet(desk)) {
    return {
      display: selected,
      swap: null,
      routed,
      analysisSymbol,
      chapelSymbol,
      routeNote: routed
        ? `${analysisSymbol} has no Chapel pool — fund BNB/CAKE on ${BSC_CHAIN_LABEL} to trade.`
        : null,
    };
  }

  const marketRow = isGateSymbol(analysisSymbol) ? mergeGateBenchmarkRow(selected) : selected;
  const swap = isGateSymbol(analysisSymbol)
    ? overlayGateMarketOnDesk(desk, marketRow)
    : desk;

  return {
    display: marketRow,
    swap,
    routed,
    analysisSymbol,
    chapelSymbol,
    routeNote: routed
      ? `${analysisSymbol} thesis · Chapel executes ${chapelSymbol} on ${BSC_CHAIN_LABEL} (live gate data, real wallet swap).`
      : null,
  };
}

/** Swap token for console trade hub when nothing selected — CAKE default desk. */
export function defaultChapelDeskToken(
  deskTokens: TrendingMarketToken[],
): TrendingMarketToken | null {
  return deskTokens.find((t) => norm(t.symbol) === "CAKE") ?? deskTokens[0] ?? null;
}
