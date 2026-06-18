/**
 * BNB Hack live feed anchors — CMC-listed BSC benchmarks (not stables).
 * Mainnet DexScreener pairs for charts; wallet desk stays on BSC Testnet.
 */
import type { TrendingToken } from "./dexscreener";
import { fetchTokenByAddress } from "./dexscreener";
import { BSC_MARKET_CHAIN_SLUG } from "./bsc-chain";
import { tokenKey } from "./feed-curation";

export const BSC_FEED_ANCHOR_SYMBOLS = ["BNB", "CAKE", "FLOKI", "XVS"] as const;

export type BscFeedAnchorSymbol = (typeof BSC_FEED_ANCHOR_SYMBOLS)[number];

/** Canonical mainnet BSC token addresses (DexScreener / CMC intel). */
export const BSC_MAINNET_ANCHORS: Record<
  BscFeedAnchorSymbol,
  { name: string; tokenAddress: string; icon?: string }
> = {
  BNB: {
    name: "BNB",
    tokenAddress: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    icon: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  },
  CAKE: {
    name: "PancakeSwap",
    tokenAddress: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
    icon: "https://assets.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo_%281%29.png",
  },
  FLOKI: {
    name: "FLOKI",
    tokenAddress: "0xfb5B838b6cfEEdC2873aB27866079AC55363D37E",
    icon: "https://assets.coingecko.com/coins/images/16746/small/PNG_image.png",
  },
  XVS: {
    name: "Venus",
    tokenAddress: "0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63",
    icon: "https://assets.coingecko.com/coins/images/12677/small/venus.png",
  },
};

/** Fetch live BSC anchor tokens from DexScreener (real prices, pairs for charts). */
export async function fetchBscFeedAnchors(): Promise<TrendingToken[]> {
  const rows = await Promise.all(
    BSC_FEED_ANCHOR_SYMBOLS.map(async (symbol) => {
      const meta = BSC_MAINNET_ANCHORS[symbol];
      try {
        const live = await fetchTokenByAddress(BSC_MARKET_CHAIN_SLUG, meta.tokenAddress);
        if (live?.priceUsd && live.priceUsd > 0) {
          return {
            ...live,
            symbol,
            name: meta.name,
            icon: live.icon ?? meta.icon,
            discoveryTag: "BSC benchmark",
            sourceTags: ["BSC", "CoinMarketCap desk", "PancakeSwap"],
            demoTradeable: true,
            suggestedNetwork: "bsc",
          } satisfies TrendingToken;
        }
      } catch {
        /* fall through to static row */
      }
      return {
        symbol,
        name: meta.name,
        tokenAddress: meta.tokenAddress,
        chainId: BSC_MARKET_CHAIN_SLUG,
        pairAddress: "",
        priceUsd: 0,
        change24h: 0,
        volume24h: 0,
        liquidityUsd: 0,
        icon: meta.icon,
        url: `https://dexscreener.com/bsc/${meta.tokenAddress}`,
        discoveryTag: "BSC benchmark",
        sourceTags: ["BSC", "CoinMarketCap desk"],
        demoTradeable: true,
        suggestedNetwork: "bsc",
      } satisfies TrendingToken;
    }),
  );
  return rows.filter((t) => t.priceUsd > 0 || t.pairAddress);
}

/** Pin BSC anchors at top; drop duplicate symbols and de-prioritize non-BSC filler. */
export function mergeBscAnchorsIntoFeed<T extends TrendingToken>(anchors: T[], pool: T[], limit: number): T[] {
  const anchorKeys = new Set(anchors.map((t) => tokenKey(t)));
  const anchorSyms = new Set(anchors.map((t) => t.symbol.toUpperCase()));

  const rest = pool.filter((t) => {
    const sym = t.symbol.toUpperCase();
    if (anchorKeys.has(tokenKey(t))) return false;
    if (anchorSyms.has(sym)) return false;
    if (t.chainId === "base" || t.chainId === "solana" || t.chainId === "arbitrum") return false;
    return true;
  });

  const merged = [...anchors, ...rest];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const t of merged) {
    const k = tokenKey(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out.length ? out : anchors.slice(0, limit);
}
