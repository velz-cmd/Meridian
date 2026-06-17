import { defineChain } from "viem";

/** BNB Smart Chain — Trust Wallet / MetaMask injected (BNB Hack sponsor alignment) */
export const BSC_CHAIN_ID = 56;

export const bsc = defineChain({
  id: BSC_CHAIN_ID,
  name: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_BSC_RPC_URL ?? "https://bsc-dataseed.binance.org"],
    },
  },
  blockExplorers: {
    default: { name: "BscScan", url: "https://bscscan.com" },
  },
});

export const BSC_EXPLORER = "https://bscscan.com";

export function bscExplorerTx(hash: string) {
  return `${BSC_EXPLORER}/tx/${hash}`;
}

export function bscExplorerAddress(address: string) {
  return `${BSC_EXPLORER}/address/${address}`;
}
