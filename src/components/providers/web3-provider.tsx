"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { bsc } from "@/lib/bsc-chain";

/** BSC Testnet — Trust Wallet / MetaMask (BNB Hack) */
const config = createConfig({
  chains: [bsc],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [bsc.id]: http(bsc.rpcUrls.default.http[0]),
  },
  ssr: false,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
