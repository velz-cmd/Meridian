import { bsc, BSC_CHAIN_ID, BSC_CHAIN_LABEL } from "./bsc-chain";

/** BSC Testnet — demo portfolio + Trust Wallet alignment for BNB Hack */
export const DEMO_TRADE_NETWORKS = [
  { id: "bsc", chainId: BSC_CHAIN_ID, label: BSC_CHAIN_LABEL, short: "BSC", chain: bsc },
] as const;

export type DemoTradeNetworkId = (typeof DEMO_TRADE_NETWORKS)[number]["id"];

export function demoNetworkById(id: DemoTradeNetworkId = "bsc") {
  return DEMO_TRADE_NETWORKS[0];
}

export function demoNetworkFromChainId(chainId?: number) {
  return chainId === BSC_CHAIN_ID ? DEMO_TRADE_NETWORKS[0] : undefined;
}

/** Demo trades settle on BSC Testnet; price feeds may come from mainnet DexScreener slug */
export function mirrorTestnetForSource(_sourceChain: string): DemoTradeNetworkId {
  return "bsc";
}

export { birdeyeChainFor } from "./birdeye-client";
