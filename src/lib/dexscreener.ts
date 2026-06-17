import { mapWithConcurrency } from "./async-pool";
import { pairAgeHoursFromCreatedAt } from "./dexscreener-market";
import { WALLET_SWAP_CHAINS, SWAP_CRITERIA, checkSwappable, filterSwappableTokens, type WalletSwapChain } from "./swappable";
import { isEvmChain } from "./swap";
import { buildLocalTokenIntel } from "./token-intel-local";
import {
  fetchDexPaprikaTopTokens,
  paprikaNetworksForCycle,
} from "./dexpaprika";
import type { TokenIntel } from "./storage";
import { isStablecoin } from "./token-filters";
import { isBlueChip } from "./feed-curation";

export type TrendingToken = {
  symbol: string;
  name: string;
  tokenAddress: string;
  chainId: string;
  pairAddress: string;
  priceUsd: number;
  change24h: number;
  volume24h: number;
  liquidityUsd: number;
  marketCap?: number;
  fdv?: number;
  icon?: string;
  url: string;
  txns24h?: { buys: number; sells: number };
  /** Hours since best pair was created (DexScreener pairCreatedAt). */
  pairAgeHours?: number;
  quoteSymbol?: string;
  swappable?: boolean;
  demoTradeable?: boolean;
  suggestedNetwork?: string;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  intel?: TokenIntel;
  /** Live feed: hunter tier label (2x zone, fresh launch, etc.) */
  discoveryTag?: string;
  sourceTags?: string[];
};

type DexPair = {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { symbol: string };
  priceUsd?: string;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  txns?: { h24?: { buys?: number; sells?: number } };
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
};

export function mapPairFromDexPair(pair: DexPair): TrendingToken {
  return mapPair(pair);
}

function mapPair(pair: DexPair): TrendingToken {
  const token: TrendingToken = {
    symbol: pair.baseToken.symbol,
    name: pair.baseToken.name,
    tokenAddress: pair.baseToken.address,
    chainId: pair.chainId,
    pairAddress: pair.pairAddress,
    priceUsd: Number(pair.priceUsd ?? 0),
    change24h: pair.priceChange?.h24 ?? 0,
    priceChange: {
      m5: pair.priceChange?.m5,
      h1: pair.priceChange?.h1,
      h6: pair.priceChange?.h6,
      h24: pair.priceChange?.h24 ?? 0,
    },
    volume24h: pair.volume?.h24 ?? 0,
    liquidityUsd: pair.liquidity?.usd ?? 0,
    marketCap: pair.marketCap,
    fdv: pair.fdv,
    icon: pair.info?.imageUrl,
    url: pair.url,
    txns24h: {
      buys: pair.txns?.h24?.buys ?? 0,
      sells: pair.txns?.h24?.sells ?? 0,
    },
    pairAgeHours: pairAgeHoursFromCreatedAt(pair.pairCreatedAt),
    quoteSymbol: pair.quoteToken.symbol,
  };
  token.swappable = checkSwappable(token).ok;
  return token;
}

async function loadPair(chainId: string, tokenAddress: string) {
  const pairRes = await fetch(
    `https://api.dexscreener.com/token-pairs/v1/${chainId}/${tokenAddress}`,
    { next: { revalidate: 30 } },
  );
  if (!pairRes.ok) return null;

  const data = (await pairRes.json()) as DexPair[];
  const withQuote = data.filter((p) =>
    SWAP_CRITERIA.quoteSymbols.some(
      (q) => p.quoteToken.symbol.toUpperCase() === q || p.baseToken.symbol.toUpperCase() === q,
    ),
  );
  const pool = withQuote.length ? withQuote : data;
  const best = pool.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  if (!best || Number(best.priceUsd ?? 0) <= 0) return null;
  return mapPair(best);
}

/** Wallet-swappable tokens only — EVM + liquidity + volume criteria */
export async function fetchSwappableTokens(limit = 8, preferredChain?: string) {
  const res = await fetch("https://api.dexscreener.com/token-boosts/top/v1", {
    next: { revalidate: 30 },
  });

  if (!res.ok) throw new Error("DexScreener boosts unavailable");

  const boosts = (await res.json()) as Array<{ chainId: string; tokenAddress: string }>;

  const evmBoosts = boosts.filter(
    (b) =>
      isEvmChain(b.chainId) &&
      WALLET_SWAP_CHAINS.includes(b.chainId as WalletSwapChain) &&
      (!preferredChain || b.chainId === preferredChain),
  );

  const pairs: TrendingToken[] = [];
  for (const token of evmBoosts) {
    const pair = await loadPair(token.chainId, token.tokenAddress);
    if (pair) pairs.push(pair);
  }

  let filtered = filterSwappableTokens(pairs, preferredChain);

  if (filtered.length < limit) {
    for (const chain of preferredChain ? [preferredChain] : WALLET_SWAP_CHAINS) {
      const searchRes = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${chain}%20USDC`,
        { next: { revalidate: 30 } },
      );
      if (!searchRes.ok) continue;
      const search = (await searchRes.json()) as { pairs?: DexPair[] };
      for (const pair of search.pairs ?? []) {
        if (pair.chainId !== chain) continue;
        const mapped = mapPair(pair);
        if (checkSwappable(mapped, preferredChain).ok) {
          filtered.push(mapped);
        }
      }
    }
    filtered = filterSwappableTokens(
      Array.from(new Map(filtered.map((t) => [`${t.chainId}:${t.tokenAddress}`, t])).values()),
      preferredChain,
    );
  }

  return filtered
    .sort((a, b) => b.liquidityUsd - a.liquidityUsd)
    .slice(0, limit);
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Discovery live feed — movers & alts (not blue-chip volume leaders). */
export async function fetchStableMarketFeed(limit = 15) {
  return fetchTrendingMarketTokens(limit, { stable: true, discovery: true });
}

/** Trending tokens — `stable: true` keeps deterministic top tokens for the live feed */
export async function fetchTrendingMarketTokens(
  limit = 100,
  opts?: { stable?: boolean; discovery?: boolean },
) {
  const tokens: TrendingToken[] = [];
  const seen = new Set<string>();
  const stable = opts?.stable === true;
  const discovery = opts?.discovery === true || stable;
  const cycle = stable ? 0 : Math.floor(Date.now() / 45_000);
  const querySets = [
    ["meme", "pump", "ai", "agent", "trending"],
    ["surge", "launch", "new", "100x"],
    ["degen", "base", "sol"],
    ["hot", "volume", "pair"],
  ];
  const discoveryQueries = [
    ["meme", "pump", "ai agent"],
    ["surge", "launch", "degen"],
    ["new pair", "100x", "moon"],
    ["base meme", "sol trending"],
  ];
  const queries = discovery
    ? discoveryQueries[cycle % discoveryQueries.length]
    : querySets[cycle % querySets.length];

  function addToken(token: TrendingToken | null) {
    if (!token || token.priceUsd <= 0) return;
    if (
      isStablecoin(token.symbol, token.name, {
        tokenAddress: token.tokenAddress,
        chainId: token.chainId,
        priceUsd: token.priceUsd,
        change24h: token.change24h,
      })
    ) {
      return;
    }
    if (isBlueChip(token.symbol, token.name)) return;
    const key = `${token.chainId}:${token.tokenAddress}`;
    if (seen.has(key)) return;
    seen.add(key);
    tokens.push({ ...token, demoTradeable: true, suggestedNetwork: "bsc" });
  }

  const fetches = [
    fetch("https://api.dexscreener.com/token-boosts/top/v1", { cache: "no-store" }),
    fetch("https://api.dexscreener.com/token-boosts/latest/v1", { cache: "no-store" }),
    fetch("https://api.dexscreener.com/token-profiles/latest/v1", { cache: "no-store" }),
    ...WALLET_SWAP_CHAINS.flatMap((chain) =>
      queries.map((q) =>
        fetch(`https://api.dexscreener.com/latest/dex/search?q=${chain}%20${q}`, {
          cache: "no-store",
        }),
      ),
    ),
  ];

  const paprikaBatches = await Promise.all(
    paprikaNetworksForCycle(cycle).map((network) => fetchDexPaprikaTopTokens(network, 20)),
  );
  const paprikaFlat = paprikaBatches.flat();
  for (const t of paprikaFlat) {
    if (t.pairAddress) addToken(t);
  }
  const paprikaNeedsPair = paprikaFlat.filter((t) => !t.pairAddress);
  const paprikaResolved = await mapWithConcurrency(
    paprikaNeedsPair,
    (t) => loadPair(t.chainId, t.tokenAddress),
    8,
  );
  for (const pair of paprikaResolved) addToken(pair);

  const results = await Promise.allSettled(fetches);
  const boostCandidates: Array<{ chainId: string; tokenAddress: string }> = [];
  const profileByKey = new Map<string, { icon?: string; description?: string }>();

  for (const result of results) {
    if (result.status !== "fulfilled" || !result.value.ok) continue;
    const json = await result.value.json();

    if (Array.isArray(json)) {
      for (const item of json as Array<{
        chainId?: string;
        tokenAddress?: string;
        icon?: string;
        description?: string;
      }>) {
        if (item.chainId && item.tokenAddress && isEvmChain(item.chainId)) {
          boostCandidates.push({ chainId: item.chainId, tokenAddress: item.tokenAddress });
          const pk = `${item.chainId}:${item.tokenAddress.toLowerCase()}`;
          if (item.icon || item.description) {
            profileByKey.set(pk, { icon: item.icon, description: item.description });
          }
        }
      }
      continue;
    }

    const pairs = (json as { pairs?: DexPair[] }).pairs ?? [];
    for (const pair of pairs) {
      if (WALLET_SWAP_CHAINS.includes(pair.chainId as WalletSwapChain)) {
        addToken(mapPair(pair));
      }
    }
  }

  const uniqueBoosts = Array.from(
    new Map(boostCandidates.map((c) => [`${c.chainId}:${c.tokenAddress}`, c])).values(),
  ).slice(0, stable ? 24 : 40);
  const boostPairs = await mapWithConcurrency(
    uniqueBoosts,
    (c) => loadPair(c.chainId, c.tokenAddress),
    10,
  );
  for (const pair of boostPairs) addToken(pair);

  let sorted: TrendingToken[];
  if (discovery) {
    const { curateLiveFeed } = await import("./feed-curation");
    sorted = curateLiveFeed(tokens, limit * 3).slice(0, limit);
  } else {
    const ranked = tokens.sort(
      (a, b) => b.volume24h - a.volume24h || b.liquidityUsd - a.liquidityUsd,
    );
    sorted = stable ? ranked.slice(0, limit) : shuffleWithSeed(ranked, cycle).slice(0, limit);
  }

  return sorted
    .filter(
      (token) =>
        !isStablecoin(token.symbol, token.name, {
          tokenAddress: token.tokenAddress,
          chainId: token.chainId,
          priceUsd: token.priceUsd,
          change24h: token.change24h,
        }),
    )
    .map((token) => {
      const prof = profileByKey.get(`${token.chainId}:${token.tokenAddress.toLowerCase()}`);
      const enriched = prof?.icon ? { ...token, icon: token.icon ?? prof.icon } : token;
      return {
        ...enriched,
        intel: buildLocalTokenIntel(enriched),
      };
    });
}

/** @deprecated use fetchSwappableTokens */
export async function fetchTrendingTokens(limit = 12): Promise<TrendingToken[]> {
  return fetchSwappableTokens(limit);
}

export async function fetchTokenPair(chainId: string, tokenAddress: string) {
  const pair = await loadPair(chainId, tokenAddress);
  if (!pair || !checkSwappable(pair).ok) return null;
  return pair;
}

export async function fetchTokenByAddress(chainId: string, tokenAddress: string) {
  return loadPair(chainId, tokenAddress);
}

export function dexChartEmbedUrl(chainId: string, pairAddress: string) {
  return `https://dexscreener.com/${chainId}/${pairAddress}?embed=1&loadChartSettings=0&trades=0&tabs=0&info=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=1&chartType=usd&interval=15`;
}

export function jupiterSwapUrl(tokenAddress: string) {
  return `https://jup.ag/swap/SOL-${tokenAddress}`;
}

export function zeroXSwapUrl(chainId: number, buyToken: string) {
  const base = chainId === 8453 ? "https://base.app" : "https://app.uniswap.org";
  return `${base}/swap?outputCurrency=${buyToken}&chain=${chainId === 8453 ? "base" : "mainnet"}`;
}
