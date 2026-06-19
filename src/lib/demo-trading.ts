import { randomUUID } from "crypto";
import type { TrendingToken } from "./dexscreener";
import { applyHonestTradeFlags } from "./honest-trade-flags";
import { mirrorTestnetForSource, type DemoTradeNetworkId } from "./testnet-chains";

export type DemoTradeSide = "buy" | "sell" | "swap_to_usdc";

/** Snapshot at trade entry for Trade Autopsy — expected vs actual. */
export type DemoTradeThesisSnapshot = {
  permitId?: string;
  expectedConviction?: number;
  gateSignal?: string;
  verdict?: string;
  skillStances?: Array<{ skill: string; score: number; stance: string }>;
  source?: string;
  capturedAt: string;
};

export type DemoPosition = {
  id: string;
  wallet: string;
  symbol: string;
  name?: string;
  tokenAddress: string;
  sourceChain: string;
  tradeNetwork: DemoTradeNetworkId;
  tokenAmount: number;
  avgEntryUsd: number;
  usdcSpent: number;
  priceUsd: number;
  icon?: string;
  pairAddress?: string;
  createdAt: string;
  updatedAt: string;
  arcFeeTxHashes: string[];
};

export type DemoTradeRecord = {
  id: string;
  wallet: string;
  side: DemoTradeSide;
  symbol: string;
  tokenAddress: string;
  sourceChain: string;
  tradeNetwork: DemoTradeNetworkId;
  usdcAmount: number;
  tokenAmount: number;
  priceUsd: number;
  arcFeeTxHash: string;
  timestamp: string;
  pnlUsd?: number;
  thesisSnapshot?: DemoTradeThesisSnapshot;
};

export function buildDemoQuote(input: {
  side: DemoTradeSide;
  usdcAmount?: number;
  tokenAmount?: number;
  priceUsd: number;
  position?: DemoPosition | null;
  tbnbSpent?: number;
  bnbSpotUsd?: number;
}) {
  const price = Math.max(input.priceUsd, 0.00000001);

  if (input.side === "buy") {
    const usd = input.usdcAmount ?? 0;
    const tokens = usd / price;
    const tbnb =
      input.tbnbSpent ??
      (input.bnbSpotUsd && input.bnbSpotUsd > 0 ? usd / input.bnbSpotUsd : usd);
    return {
      side: "buy" as const,
      usdcIn: usd,
      tokenOut: tokens,
      priceUsd: price,
      label: `Buy ${tokens >= 1_000_000 ? tokens.toExponential(3) : tokens.toFixed(4)} tokens for ${tbnb.toFixed(4)} tBNB (~$${usd.toFixed(2)})`,
    };
  }

  const pos = input.position;
  const tokens =
    input.side === "swap_to_usdc"
      ? (pos?.tokenAmount ?? 0)
      : (input.tokenAmount ?? pos?.tokenAmount ?? 0);
  const usdcOut = tokens * price;
  const costBasis = tokens * (pos?.avgEntryUsd ?? price);
  const pnl = usdcOut - costBasis;

  return {
    side: input.side,
    tokenIn: tokens,
    usdcOut,
    priceUsd: price,
    pnlUsd: pnl,
    label:
      input.side === "swap_to_usdc"
        ? `Swap ${tokens.toFixed(6)} → ${usdcOut.toFixed(4)} tBNB`
        : `Sell ${tokens.toFixed(6)} for ${usdcOut.toFixed(4)} tBNB`,
  };
}

export function applyDemoTrade(
  positions: DemoPosition[],
  trade: DemoTradeRecord,
): { positions: DemoPosition[]; trade: DemoTradeRecord } {
  const key = `${trade.wallet}:${trade.tokenAddress}:${trade.tradeNetwork}`.toLowerCase();
  const existing = positions.find(
    (p) =>
      `${p.wallet}:${p.tokenAddress}:${p.tradeNetwork}`.toLowerCase() === key,
  );

  if (trade.side === "buy") {
    if (existing) {
      const totalTokens = existing.tokenAmount + trade.tokenAmount;
      const totalSpent = existing.usdcSpent + trade.usdcAmount;
      existing.tokenAmount = totalTokens;
      existing.usdcSpent = totalSpent;
      existing.avgEntryUsd = totalSpent / totalTokens;
      existing.priceUsd = trade.priceUsd;
      existing.updatedAt = trade.timestamp;
      existing.arcFeeTxHashes.push(trade.arcFeeTxHash);
    } else {
      positions.unshift({
        id: randomUUID(),
        wallet: trade.wallet,
        symbol: trade.symbol,
        tokenAddress: trade.tokenAddress,
        sourceChain: trade.sourceChain,
        tradeNetwork: trade.tradeNetwork,
        tokenAmount: trade.tokenAmount,
        avgEntryUsd: trade.priceUsd,
        usdcSpent: trade.usdcAmount,
        priceUsd: trade.priceUsd,
        createdAt: trade.timestamp,
        updatedAt: trade.timestamp,
        arcFeeTxHashes: [trade.arcFeeTxHash],
      });
    }
    return { positions, trade };
  }

  if (!existing || existing.tokenAmount <= 0) {
    throw new Error("No open demo position for this token");
  }

  const sellAmount =
    trade.side === "swap_to_usdc"
      ? Math.min(trade.tokenAmount > 0 ? trade.tokenAmount : existing.tokenAmount, existing.tokenAmount)
      : trade.tokenAmount;
  if (sellAmount > existing.tokenAmount + 1e-12) {
    throw new Error("Insufficient demo token balance");
  }

  const costBasis = sellAmount * existing.avgEntryUsd;
  trade.pnlUsd = trade.usdcAmount - costBasis;

  existing.tokenAmount -= sellAmount;
  existing.usdcSpent = existing.tokenAmount * existing.avgEntryUsd;
  existing.priceUsd = trade.priceUsd;
  existing.updatedAt = trade.timestamp;
  existing.arcFeeTxHashes.push(trade.arcFeeTxHash);

  const next = existing.tokenAmount <= 1e-9
    ? positions.filter((p) => p.id !== existing.id)
    : positions;

  return { positions: next, trade };
}

export function trendingToDemoToken(token: TrendingToken) {
  return applyHonestTradeFlags({
    ...token,
    suggestedNetwork: mirrorTestnetForSource(token.chainId),
  });
}

export type MarkedPosition = DemoPosition & {
  markPriceUsd: number;
  currentValueUsd: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
};

/** Refresh open positions with live DexScreener mark prices for real P&L */
export async function markPositionsToMarket(
  positions: DemoPosition[],
  priceLookup: (chainId: string, tokenAddress: string) => Promise<number | null>,
): Promise<MarkedPosition[]> {
  return Promise.all(
    positions.map(async (p) => {
      const live = await priceLookup(p.sourceChain, p.tokenAddress);
      const markPriceUsd = live && live > 0 ? live : p.priceUsd;
      const currentValueUsd = p.tokenAmount * markPriceUsd;
      const unrealizedPnlUsd = currentValueUsd - p.usdcSpent;
      const unrealizedPnlPct =
        p.usdcSpent > 0 ? (unrealizedPnlUsd / p.usdcSpent) * 100 : 0;

      return {
        ...p,
        markPriceUsd,
        currentValueUsd,
        unrealizedPnlUsd,
        unrealizedPnlPct,
      };
    }),
  );
}
