import { bsc, BSC_CHAIN_ID } from "./bsc-chain";

/** BNB Smart Chain — demo portfolio + Trust Wallet alignment for BNB Hack */
export const DEMO_TRADE_NETWORKS = [
  { id: "bsc", chainId: BSC_CHAIN_ID, label: "BNB Smart Chain", short: "BSC", chain: bsc },
] as const;

export type DemoTradeNetworkId = (typeof DEMO_TRADE_NETWORKS)[number]["id"];

export function demoNetworkById(id: DemoTradeNetworkId = "bsc") {
  return DEMO_TRADE_NETWORKS[0];
}

export function demoNetworkFromChainId(chainId?: number) {
  return chainId === BSC_CHAIN_ID ? DEMO_TRADE_NETWORKS[0] : undefined;
}

/** Demo trades settle on BSC; price feeds may come from any DexScreener chain */
export function mirrorTestnetForSource(_sourceChain: string): DemoTradeNetworkId {
  return "bsc";
}

export { birdeyeChainFor } from "./birdeye-client";
