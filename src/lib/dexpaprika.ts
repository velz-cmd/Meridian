import type { TrendingToken } from "./dexscreener";
import { WALLET_SWAP_CHAINS, type WalletSwapChain } from "./swappable";
import type { TokenTx, TokenWhale } from "./storage";

const BASE = "https://api.dexpaprika.com";

export function dexpaprikaNetwork(chainId: string): string | null {
  const map: Record<string, string> = {
    ethereum: "ethereum",
    arbitrum: "arbitrum",
    base: "base",
    bsc: "bsc",
    polygon: "polygon",
    optimism: "optimism",
    avalanche: "avalanche",
    solana: "solana",
  };
  return map[chainId.toLowerCase()] ?? null;
}

type PaprikaSummary = {
  price_usd?: number;
  fdv?: number;
  liquidity_usd?: number;
  pools?: number;
  "24h"?: {
    volume_usd?: number;
    buys?: number;
    sells?: number;
    txns?: number;
    buy_usd?: number;
    sell_usd?: number;
    last_price_usd_change?: number;
  };
};

type PaprikaToken = {
  id?: string;
  address?: string;
  name?: string;
  symbol?: string;
  summary?: PaprikaSummary;
  price_stats?: { ath?: number; low_24h?: number; high_24h?: number };
};

type PaprikaTopItem = {
  address?: string;
  name?: string;
  symbol?: string;
  price_usd?: number;
  fdv?: number;
  liquidity_usd?: number;
  "24h"?: PaprikaSummary["24h"];
};

async function paprikaGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchDexPaprikaToken(chainId: string, tokenAddress: string) {
  const network = dexpaprikaNetwork(chainId);
  if (!network) return null;
  const addr = tokenAddress.toLowerCase();
  return paprikaGet<PaprikaToken>(`/networks/${network}/tokens/${addr}`);
}

export async function fetchDexPaprikaTopTokens(
  network: string,
  limit = 12,
): Promise<TrendingToken[]> {
  const data = await paprikaGet<{ tokens?: PaprikaTopItem[] }>(
    `/networks/${network}/tokens/top?limit=${limit}&order_by=volume_24h&sort=desc`,
  );
  if (!data?.tokens?.length) return [];

  const chainId = network as WalletSwapChain;
  if (!WALLET_SWAP_CHAINS.includes(chainId)) return [];

  return data.tokens
    .filter((t) => t.address && (t.price_usd ?? 0) > 0)
    .map((t) => {
      const h24 = t["24h"];
      return {
        symbol: t.symbol ?? "???",
        name: t.name ?? t.symbol ?? "Token",
        tokenAddress: t.address!,
        chainId,
        pairAddress: "",
        priceUsd: t.price_usd ?? 0,
        change24h: h24?.last_price_usd_change ?? 0,
        volume24h: h24?.volume_usd ?? 0,
        liquidityUsd: t.liquidity_usd ?? 0,
        marketCap: t.fdv,
        fdv: t.fdv,
        url: `https://dexscreener.com/${chainId}/${t.address}`,
        txns24h: {
          buys: h24?.buys ?? 0,
          sells: h24?.sells ?? 0,
        },
        demoTradeable: true,
        suggestedNetwork: "bsc",
      } satisfies TrendingToken;
    });
}

export async function fetchDexPaprikaPoolTxs(
  chainId: string,
  poolId: string,
  limit = 12,
): Promise<TokenTx[]> {
  const network = dexpaprikaNetwork(chainId);
  if (!network || !poolId) return [];

  const data = await paprikaGet<{
    transactions?: Array<{
      hash?: string;
      type?: string;
      amount_usd?: number;
      price_usd?: number;
      timestamp?: string;
      trader?: string;
      sender?: string;
      side?: string;
    }>;
  }>(`/networks/${network}/pools/${poolId}/transactions?page=0&limit=${limit}`);

  const items = data?.transactions ?? [];
  const mapped: TokenTx[] = [];
  for (const tx of items) {
    const sideRaw = String(tx.side ?? tx.type ?? "").toLowerCase();
    const side: TokenTx["side"] = sideRaw.includes("sell")
      ? "sell"
      : sideRaw.includes("buy")
        ? "buy"
        : "unknown";
    const trader = tx.trader ?? tx.sender ?? "";
    if (!trader) continue;
    mapped.push({
      hash: tx.hash,
      type: "swap",
      side,
      amountUsd: tx.amount_usd ?? tx.price_usd ?? 0,
      trader,
      timestamp: tx.timestamp ?? new Date().toISOString(),
    });
  }
  return mapped;
}

export async function fetchDexPaprikaTopPool(chainId: string, tokenAddress: string) {
  const network = dexpaprikaNetwork(chainId);
  if (!network) return null;
  const data = await paprikaGet<{
    pools?: Array<{ id?: string; address?: string; dex?: string; volume_24h?: number }>;
  }>(`/networks/${network}/tokens/${tokenAddress.toLowerCase()}/pools?limit=1&order_by=volume_24h&sort=desc`);
  return data?.pools?.[0] ?? null;
}

export function paprikaToWhales(token: PaprikaToken, limit = 8): TokenWhale[] {
  const h = token.summary?.["24h"];
  if (!h) return [];
  const buyUsd = h.buy_usd ?? 0;
  const sellUsd = h.sell_usd ?? 0;
  const whales: TokenWhale[] = [];
  if (buyUsd > 0) {
    whales.push({
      address: "flow-buy-aggregate",
      balance: buyUsd,
      pct: (buyUsd / Math.max(buyUsd + sellUsd, 1)) * 100,
      label: "24h buy flow",
    });
  }
  if (sellUsd > 0) {
    whales.push({
      address: "flow-sell-aggregate",
      balance: sellUsd,
      pct: (sellUsd / Math.max(buyUsd + sellUsd, 1)) * 100,
      label: "24h sell flow",
    });
  }
  return whales.slice(0, limit);
}

export function paprikaIntelFromToken(token: PaprikaToken) {
  const s = token.summary;
  const h = s?.["24h"];
  return {
    marketCap: s?.fdv,
    fdv: s?.fdv,
    trade24h: h?.txns,
    buy24h: h?.buys,
    sell24h: h?.sells,
    priceUsd: s?.price_usd,
    liquidityUsd: s?.liquidity_usd,
    change24h: h?.last_price_usd_change,
  };
}

/** Rotate EVM chains each ~45s for fresh trending lists */
export function paprikaNetworksForCycle(cycle: number): string[] {
  const sets = [
    ["arbitrum", "base"],
    ["ethereum", "polygon"],
    ["bsc", "optimism"],
    ["base", "arbitrum"],
  ];
  return sets[cycle % sets.length];
}
