import { defineChain, createPublicClient, http } from "viem";

/** BNB Smart Chain Testnet (Chapel) — BNB Hack demo & wallet settlement */
export const BSC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_BSC_CHAIN_ID ?? 97);

export const BSC_CHAIN_LABEL = "BSC Testnet";

/** DexScreener / CMC market intel slug — mainnet BSC prices while wallet stays on testnet */
export const BSC_MARKET_CHAIN_SLUG = "bsc";

/** Wrapped BNB on BSC Testnet (Chapel) */
export const BSC_TESTNET_WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";

/** PancakeSwap test token on Chapel — demo CAKE stand-in for NEXUS desk */
export const BSC_TESTNET_CAKE = "0xFa60D973F7642B746046991C42532267D238F491";

const BSC_TESTNET_RPC =
  process.env.NEXT_PUBLIC_BSC_RPC_URL ?? "https://data-seed-prebsc-1-s1.binance.org:8545";

export const bsc = defineChain({
  id: BSC_CHAIN_ID,
  name: BSC_CHAIN_LABEL,
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: {
    default: {
      http: [BSC_TESTNET_RPC],
    },
  },
  blockExplorers: {
    default: { name: "BscScan Testnet", url: "https://testnet.bscscan.com" },
  },
  testnet: true,
});

export const BSC_EXPLORER = "https://testnet.bscscan.com";

export function bscExplorerTx(hash: string) {
  return `${BSC_EXPLORER}/tx/${hash}`;
}

export function bscExplorerAddress(address: string) {
  return `${BSC_EXPLORER}/address/${address}`;
}

export function getBscPublicClient() {
  return createPublicClient({
    chain: bsc,
    transport: http(bsc.rpcUrls.default.http[0]),
  });
}
