import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import {
  BSC_CHAIN_ID,
  BSC_EXPLORER,
  BSC_MARKET_CHAIN_SLUG,
  BSC_TESTNET_BUSD,
  BSC_TESTNET_CAKE,
  BSC_TESTNET_WBNB,
} from "@/lib/bsc-chain";
import { createBscNativeBnbSwapToken, isBscNativeBnb } from "@/lib/arc-usdc-swap";
import { getBscPublicClient } from "@/lib/bsc-chain";
import { ERC20_ABI } from "@/lib/pancake-v2";
import { formatUnits, getAddress, isAddress, type Address } from "viem";

/** BSC Testnet (Chapel) contracts — PancakeSwap V2 desk */
export const TESTNET_KNOWN_TOKENS: Record<string, `0x${string}`> = {
  WBNB: BSC_TESTNET_WBNB,
  BNB: BSC_TESTNET_WBNB,
  CAKE: BSC_TESTNET_CAKE,
  BUSD: BSC_TESTNET_BUSD,
  USDC: "0x64544969ed7EBf5f083679233325356EbE738930",
};

/** Mainnet BSC symbols used to hydrate USD prices for the testnet desk */
export const TESTNET_PRICE_SYMBOL: Record<string, string> = {
  CAKE: "CAKE",
  BUSD: "BUSD",
  USDC: "USDC",
};

export type TestnetCatalogRow = {
  symbol: string;
  name: string;
  tokenAddress: `0x${string}`;
  icon?: string;
  /** DexScreener slug for live chart intel (mainnet BSC) */
  marketSymbol: string;
};

const BNB_ICON = "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png";
const CAKE_ICON = "https://assets.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo_%281%29.png";
const BUSD_ICON = "https://assets.coingecko.com/coins/images/9576/small/BUSD.png";
const USDC_ICON = "https://assets.coingecko.com/coins/images/6319/small/usdc.png";

/** Canonical BSC Testnet trade desk — on-chain addresses on chain 97 */
export const BSC_TESTNET_CATALOG: TestnetCatalogRow[] = [
  {
    symbol: "CAKE",
    name: "PancakeSwap",
    tokenAddress: BSC_TESTNET_CAKE,
    icon: CAKE_ICON,
    marketSymbol: "CAKE",
  },
  {
    symbol: "BUSD",
    name: "Binance USD (test)",
    tokenAddress: TESTNET_KNOWN_TOKENS.BUSD,
    icon: BUSD_ICON,
    marketSymbol: "BUSD",
  },
  {
    symbol: "USDC",
    name: "USD Coin (test)",
    tokenAddress: TESTNET_KNOWN_TOKENS.USDC,
    icon: USDC_ICON,
    marketSymbol: "USDC",
  },
];

export function isBscTestnetChainId(chainId: string | number | undefined): boolean {
  return String(chainId) === String(BSC_CHAIN_ID);
}

export function buildBscTestnetTradeTokens(bnbSpotUsd = 0): TrendingMarketToken[] {
  const native = createBscNativeBnbSwapToken(bnbSpotUsd);
  const rows: TrendingMarketToken[] = BSC_TESTNET_CATALOG.map((row) => ({
    symbol: row.symbol,
    name: row.name,
    tokenAddress: row.tokenAddress,
    chainId: String(BSC_CHAIN_ID),
    pairAddress: "",
    priceUsd: row.symbol === "BUSD" || row.symbol === "USDC" ? 1 : 0,
    change24h: 0,
    volume24h: 0,
    liquidityUsd: 0,
    icon: row.icon,
    url: `${BSC_EXPLORER}/token/${row.tokenAddress}`,
    demoTradeable: true,
    discoveryTag: "bsc-testnet-desk",
    sourceTags: ["BSC Testnet", "PancakeSwap"],
    agent: {
      action: row.symbol === "CAKE" ? "BUY" : "HOLD",
      confidence: row.symbol === "CAKE" ? 78 : 65,
      riskScore: 40,
      reasoning: `${row.symbol} on BSC Testnet — wallet-signed PancakeSwap swaps.`,
      whyAction: "Real on-chain desk token on Chapel (chain 97).",
      reasoningFactors: [],
    },
  }));

  return [native, ...rows];
}

/** Swap / trade UI uses testnet desk only (not mainnet feed meme tokens). */
export function getBscTestnetSwapList(bnbSpotUsd = 0): TrendingMarketToken[] {
  return buildBscTestnetTradeTokens(bnbSpotUsd);
}

export function isTestnetDeskToken(token: {
  tokenAddress: string;
  chainId: string;
}): boolean {
  if (isBscNativeBnb(token.tokenAddress)) return true;
  if (!isBscTestnetChainId(token.chainId)) return false;
  const addr = token.tokenAddress.toLowerCase();
  return BSC_TESTNET_CATALOG.some((r) => r.tokenAddress.toLowerCase() === addr);
}

export function resolveTestnetSwapAddress(input: {
  symbol: string;
  tokenAddress: string;
  chainId: string;
}): `0x${string}` | null {
  if (isBscNativeBnb(input.tokenAddress)) return null;

  const sym = input.symbol.replace(/^\$/, "").trim().toUpperCase();
  const known = TESTNET_KNOWN_TOKENS[sym];
  if (known) return known;

  if (isBscTestnetChainId(input.chainId) && isAddress(input.tokenAddress)) {
    return getAddress(input.tokenAddress);
  }

  return null;
}

export function canSwapOnBscTestnet(input: {
  symbol: string;
  tokenAddress: string;
  chainId: string;
}): boolean {
  if (isBscNativeBnb(input.tokenAddress)) return true;
  return resolveTestnetSwapAddress(input) !== null;
}

export function testnetSwapHint(input: {
  symbol: string;
  tokenAddress: string;
  chainId: string;
}): string | null {
  if (canSwapOnBscTestnet(input)) return null;
  return `${input.symbol} is not on the BSC Testnet desk — select BNB, CAKE, BUSD, or USDC to trade on-chain.`;
}

/** Match selected feed row to testnet desk token by symbol (for chart + trade alignment). */
export function matchTestnetDeskBySymbol(
  symbol: string,
  bnbSpotUsd = 0,
): TrendingMarketToken | null {
  const sym = symbol.replace(/^\$/, "").trim().toUpperCase();
  if (sym === "BNB" || sym === "TBNB" || sym === "WBNB") {
    return createBscNativeBnbSwapToken(bnbSpotUsd);
  }
  return buildBscTestnetTradeTokens(bnbSpotUsd).find((t) => t.symbol.toUpperCase() === sym) ?? null;
}

export function testnetMarketChainForQuote(symbol: string): string {
  return BSC_MARKET_CHAIN_SLUG;
}

/** On-chain ERC-20 balance for BSC Testnet desk tokens. */
export async function fetchDeskTokenBalance(
  wallet: Address,
  input: { symbol: string; tokenAddress: string; chainId: string },
): Promise<number> {
  const token = resolveTestnetSwapAddress(input);
  if (!token) return 0;
  const client = getBscPublicClient();
  const [raw, decimals] = await Promise.all([
    client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [wallet],
    }),
    client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "decimals",
    }),
  ]);
  return Number(formatUnits(raw as bigint, Number(decimals)));
}
