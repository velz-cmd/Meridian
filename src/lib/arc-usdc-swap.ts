import { BSC_CHAIN_ID, BSC_EXPLORER } from "@/lib/bsc-chain";
import { getBscTestnetSwapList } from "@/lib/testnet-onchain";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

/** Sentinel — BSC Testnet native tBNB (wallet balance, not a demo position) */
export const BSC_NATIVE_BNB_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

/** @deprecated use BSC_NATIVE_BNB_ADDRESS */
export const ARC_NATIVE_USDC_ADDRESS = BSC_NATIVE_BNB_ADDRESS;

const BNB_ICON = "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png";

const NATIVE_BNB_SYMBOLS = new Set(["BNB", "WBNB", "TBNB"]);

export function isBscNativeBnb(tokenAddress: string): boolean {
  return tokenAddress.toLowerCase() === BSC_NATIVE_BNB_ADDRESS.toLowerCase();
}

export function isArcNativeUsdc(tokenAddress: string): boolean {
  return isBscNativeBnb(tokenAddress);
}

export function createBscNativeBnbSwapToken(bnbSpotUsd = 0): TrendingMarketToken {
  return {
    symbol: "BNB",
    name: "BSC Testnet tBNB",
    tokenAddress: BSC_NATIVE_BNB_ADDRESS,
    chainId: String(BSC_CHAIN_ID),
    pairAddress: "",
    priceUsd: bnbSpotUsd,
    change24h: 0,
    volume24h: 0,
    liquidityUsd: 0,
    icon: BNB_ICON,
    url: BSC_EXPLORER,
    demoTradeable: true,
  };
}

/** @deprecated use createBscNativeBnbSwapToken */
export function createArcUsdcSwapToken(bnbSpotUsd = 0): TrendingMarketToken {
  return createBscNativeBnbSwapToken(bnbSpotUsd);
}

function tokenRank(t: TrendingMarketToken): number {
  return (t.priceUsd > 0 ? 1_000_000 : 0) + (t.liquidityUsd ?? 0) + (t.volume24h ?? 0);
}

/** One row per symbol — drop duplicate BNB/WBNB feed rows when native tBNB is present. */
export function dedupeSwapTokens(tokens: TrendingMarketToken[]): TrendingMarketToken[] {
  const byAddress = new Map<string, TrendingMarketToken>();
  const bySymbol = new Map<string, TrendingMarketToken>();

  for (const t of tokens) {
    if (isBscNativeBnb(t.tokenAddress)) continue;

    const sym = t.symbol.replace(/^\$/, "").trim().toUpperCase();
    if (NATIVE_BNB_SYMBOLS.has(sym)) continue;

    const addrKey = `${t.chainId}:${t.tokenAddress}`.toLowerCase();
    const prevAddr = byAddress.get(addrKey);
    if (!prevAddr || tokenRank(t) > tokenRank(prevAddr)) {
      byAddress.set(addrKey, t);
    }

    const symKey = `${t.chainId}:${sym}`;
    const prevSym = bySymbol.get(symKey);
    if (!prevSym || tokenRank(t) > tokenRank(prevSym)) {
      bySymbol.set(symKey, t);
    }
  }

  const picked = new Set<string>();
  const out: TrendingMarketToken[] = [];
  for (const t of bySymbol.values()) {
    const k = `${t.chainId}:${t.tokenAddress}`.toLowerCase();
    if (picked.has(k)) continue;
    picked.add(k);
    out.push(t);
  }
  return out;
}

export function mergeSwapTokenList(
  _feed: TrendingMarketToken[],
  _alphaRows?: Array<{
    symbol: string;
    name: string;
    tokenAddress: string;
    chainId: string;
    priceUsd: number;
    change24h: number;
    icon?: string;
  }>,
  bnbSpotUsd = 0,
): TrendingMarketToken[] {
  return getBscTestnetSwapList(bnbSpotUsd);
}
