import { isAddress } from "viem";
import { BSC_CHAIN_ID } from "./bsc-chain";
import { evmChainId, isEvmChain } from "./swap";
import type { TrendingToken } from "./dexscreener";

/** Chains with live market data (DexScreener) — demo execution on BSC Testnet */
export const WALLET_SWAP_CHAINS = ["base", "ethereum", "arbitrum"] as const;

export type WalletSwapChain = (typeof WALLET_SWAP_CHAINS)[number];

export const SWAP_CRITERIA = {
  minLiquidityUsd: 50_000,
  minVolume24h: 20_000,
  minPriceUsd: 0.0000001,
  supportedChains: WALLET_SWAP_CHAINS,
  quoteSymbols: ["USDC", "USDT", "WETH", "ETH", "DAI"],
} as const;

export type SwappableCheck = {
  ok: boolean;
  reasons: string[];
};

export function chainIdFromWallet(chainId?: number): WalletSwapChain | "bsc" | undefined {
  if (chainId === BSC_CHAIN_ID) return "bsc";
  return undefined;
}

export function checkSwappable(token: TrendingToken, preferredChain?: string): SwappableCheck {
  const reasons: string[] = [];

  if (!isEvmChain(token.chainId)) {
    reasons.push("Not on EVM — use Jupiter for Solana");
    return { ok: false, reasons };
  }

  if (!isAddress(token.tokenAddress)) {
    reasons.push("Invalid contract address");
    return { ok: false, reasons };
  }

  if (!WALLET_SWAP_CHAINS.includes(token.chainId as WalletSwapChain)) {
    reasons.push(`Chain ${token.chainId} not supported for wallet swap`);
    return { ok: false, reasons };
  }

  if (preferredChain === "bsc") {
    reasons.push("Demo trade on BSC Testnet · settle in tBNB");
    return { ok: true, reasons };
  }

  if (preferredChain && token.chainId !== preferredChain) {
    reasons.push(`Switch wallet to ${preferredChain} or pick a ${token.chainId} token`);
    return { ok: false, reasons };
  }

  if (token.liquidityUsd < SWAP_CRITERIA.minLiquidityUsd) {
    reasons.push(`Liquidity below $${(SWAP_CRITERIA.minLiquidityUsd / 1000).toFixed(0)}K minimum`);
    return { ok: false, reasons };
  }

  if (token.volume24h < SWAP_CRITERIA.minVolume24h) {
    reasons.push(`24h volume below $${(SWAP_CRITERIA.minVolume24h / 1000).toFixed(0)}K minimum`);
    return { ok: false, reasons };
  }

  if (token.priceUsd <= SWAP_CRITERIA.minPriceUsd) {
    reasons.push("Price too low / likely dust token");
    return { ok: false, reasons };
  }

  reasons.push("EVM contract verified");
  reasons.push(`$${(token.liquidityUsd / 1000).toFixed(0)}K liquidity — swappable via 0x`);
  reasons.push(`0x routing on ${token.chainId}`);

  return { ok: true, reasons };
}

export function filterSwappableTokens(
  tokens: TrendingToken[],
  preferredChain?: string,
): TrendingToken[] {
  return tokens.filter((token) => checkSwappable(token, preferredChain).ok);
}

export function getSwapChainNumeric(chain: string) {
  return evmChainId(chain);
}
