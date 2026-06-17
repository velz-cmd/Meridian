import { BSC_CHAIN_ID, BSC_EXPLORER } from "@/lib/bsc-chain";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

/** Sentinel — BSC Testnet native tBNB (wallet balance, not a demo position) */
export const BSC_NATIVE_BNB_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

/** @deprecated use BSC_NATIVE_BNB_ADDRESS */
export const ARC_NATIVE_USDC_ADDRESS = BSC_NATIVE_BNB_ADDRESS;

const BNB_ICON = "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png";

export function isBscNativeBnb(tokenAddress: string): boolean {
  return tokenAddress.toLowerCase() === BSC_NATIVE_BNB_ADDRESS.toLowerCase();
}

export function isArcNativeUsdc(tokenAddress: string): boolean {
  return isBscNativeBnb(tokenAddress);
}

export function createBscNativeBnbSwapToken(): TrendingMarketToken {
  return {
    symbol: "BNB",
    name: "BSC Testnet tBNB",
    tokenAddress: BSC_NATIVE_BNB_ADDRESS,
    chainId: String(BSC_CHAIN_ID),
    pairAddress: "",
    priceUsd: 0,
    change24h: 0,
    volume24h: 0,
    liquidityUsd: 0,
    icon: BNB_ICON,
    url: BSC_EXPLORER,
    demoTradeable: true,
  };
}

/** @deprecated use createBscNativeBnbSwapToken */
export function createArcUsdcSwapToken(): TrendingMarketToken {
  return createBscNativeBnbSwapToken();
}

export function mergeSwapTokenList(
  feed: TrendingMarketToken[],
  alphaRows?: Array<{
    symbol: string;
    name: string;
    tokenAddress: string;
    chainId: string;
    priceUsd: number;
    change24h: number;
    icon?: string;
  }>,
): TrendingMarketToken[] {
  const byKey = new Map<string, TrendingMarketToken>();
  const add = (t: TrendingMarketToken) => {
    byKey.set(`${t.chainId}:${t.tokenAddress}`.toLowerCase(), t);
  };
  for (const t of feed) add(t);
  for (const row of alphaRows ?? []) {
    add({
      symbol: row.symbol,
      name: row.name,
      tokenAddress: row.tokenAddress,
      chainId: row.chainId,
      pairAddress: "",
      priceUsd: row.priceUsd,
      change24h: row.change24h,
      volume24h: 0,
      liquidityUsd: 0,
      icon: row.icon,
      url: `https://dexscreener.com/${row.chainId}/${row.tokenAddress}`,
      demoTradeable: true,
    });
  }
  add(createBscNativeBnbSwapToken());
  return [...byKey.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}
