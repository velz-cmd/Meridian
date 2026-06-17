"use client";

import { useAccount, useBalance, useChainId } from "wagmi";
import { ExternalLink, Wallet } from "lucide-react";
import { ArcIconBadge } from "@/components/ui/arc-icon-badge";
import { WalletConnectButton } from "@/components/nexus/wallet-connect-button";
import { NexusWalletScoreButton } from "@/components/nexus/nexus-wallet-score";
import { BSC_CHAIN_ID, bscExplorerAddress } from "@/lib/bsc-chain";
import { truncateHash } from "@/lib/utils";

export function NexusWalletBar({ compact = false }: { compact?: boolean }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address, chainId: BSC_CHAIN_ID });
  const onBsc = chainId === BSC_CHAIN_ID;

  if (compact) {
    return (
      <div className="arc-glass-card arc-glass-card-nexus flex flex-wrap items-center gap-2 px-3 py-2.5">
        <WalletConnectButton compact />
        {isConnected && balance && (
          <span className="rounded-lg border border-amber-400/30 bg-amber-500/15 px-3 py-2 text-sm font-bold text-amber-100">
            {Number(balance.formatted).toFixed(4)} BNB
          </span>
        )}
        <NexusWalletScoreButton />
        {isConnected && !onBsc && (
          <span className="w-full text-center text-[11px] text-amber-200">Switch network to BNB Smart Chain</span>
        )}
      </div>
    );
  }

  return (
    <div className="arc-panel arc-panel-nexus p-4">
      <div className="arc-panel-stripe arc-panel-stripe-nexus -mx-4 -mt-4 mb-4 w-[calc(100%+2rem)]" />
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArcIconBadge icon={Wallet} theme="nexus" size="sm" />
            <div>
              <p className="text-sm font-semibold text-white">BSC Wallet</p>
              <p className="text-xs text-white/55">
                {isConnected
                  ? onBsc
                    ? "Connected · BNB Smart Chain"
                    : "Connected · switch to BSC to trade"
                  : "Connect Trust Wallet or MetaMask to trade"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WalletConnectButton compact />
          <NexusWalletScoreButton />
        </div>

        {isConnected && address && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a
              href={bscExplorerAddress(address)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/25 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:border-amber-400/30 hover:text-amber-100 sm:flex-none"
            >
              <ExternalLink className="h-4 w-4 text-amber-300" />
              View on BscScan · {truncateHash(address, 8, 6)}
            </a>
            {balance && (
              <div className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-100">
                Balance {Number(balance.formatted).toFixed(4)} {balance.symbol}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
