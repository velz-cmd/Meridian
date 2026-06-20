"use client";

import { useAccount } from "wagmi";
import { Shield } from "lucide-react";
import { MeridianWalletConnect } from "@/components/nexus/meridian-wallet-connect";
import { BSC_CHAIN_LABEL } from "@/lib/bsc-chain";

/** Inline wallet connect for Gate execution — Trust Wallet / MetaMask on Chapel */
export function GateConnectStrip({ symbol }: { symbol: string }) {
  const { isConnected } = useAccount();

  if (isConnected) return null;

  return (
    <div className="rounded-2xl border border-violet-400/25 bg-violet-500/10 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
          <div>
            <p className="text-sm font-semibold text-white">Connect wallet to settle {symbol} thesis</p>
            <p className="mt-1 text-xs text-white/60">
              Trust Wallet or MetaMask on {BSC_CHAIN_LABEL} · real PancakeSwap Chapel swaps, not simulated
            </p>
          </div>
        </div>
        <MeridianWalletConnect compact label="Connect · Trust / MetaMask" />
      </div>
    </div>
  );
}
