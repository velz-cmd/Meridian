"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useBalance, useChainId, useDisconnect, useSwitchChain } from "wagmi";
import { ChevronDown, LogOut, Wallet } from "lucide-react";
import { BSC_CHAIN_ID, BSC_CHAIN_LABEL, bsc } from "@/lib/bsc-chain";
import { DEMO_TRADE_NETWORKS } from "@/lib/testnet-chains";
import { truncateHash } from "@/lib/utils";
import { WalletConnectButton } from "@/components/nexus/wallet-connect-button";
import { NexusWalletScoreButton } from "@/components/nexus/nexus-wallet-score";
import { cn } from "@/lib/utils";

/** Compact wallet control for the site header on NEXUS. */
export function NexusWalletMenu() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { data: balance } = useBalance({ address, chainId: BSC_CHAIN_ID });
  const onBsc = chainId === BSC_CHAIN_ID;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!isConnected) {
    return <WalletConnectButton compact />;
  }

  const balanceLabel = balance ? `${Number(balance.formatted).toFixed(4)} tBNB` : null;

  async function switchToTestnet() {
    const chain = DEMO_TRADE_NETWORKS[0];
    try {
      await switchChainAsync({ chainId: chain.chainId });
    } catch {
      const eth = (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
      await eth?.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${BSC_CHAIN_ID.toString(16)}`,
            chainName: bsc.name,
            nativeCurrency: bsc.nativeCurrency,
            rpcUrls: bsc.rpcUrls.default.http,
            blockExplorerUrls: [bsc.blockExplorers.default.url],
          },
        ],
      });
      await switchChainAsync({ chainId: chain.chainId });
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
          onBsc
            ? "border-amber-400/30 bg-amber-500/10 text-white"
            : "border-amber-400/50 bg-amber-500/15 text-amber-100",
        )}
      >
        <Wallet className="h-4 w-4 shrink-0" />
        <span className="font-semibold">{truncateHash(address ?? "", 4, 3)}</span>
        {balanceLabel && <span className="text-xs text-amber-100/90">{balanceLabel}</span>}
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[220px] rounded-xl border border-white/10 bg-[#0a0f14]/95 p-2 shadow-xl backdrop-blur-xl">
          <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-white/45">
            {onBsc ? BSC_CHAIN_LABEL : `Wrong network — need ${BSC_CHAIN_LABEL}`}
          </p>
          {!onBsc && (
            <button
              type="button"
              onClick={() => void switchToTestnet()}
              className="mb-1 w-full rounded-lg bg-amber-500/25 px-3 py-2 text-sm font-bold text-amber-50 hover:bg-amber-500/35"
            >
              Switch to {BSC_CHAIN_LABEL}
            </button>
          )}
          <NexusWalletScoreButton />
          <WalletConnectButton compact />
          <button
            type="button"
            onClick={() => disconnect()}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
