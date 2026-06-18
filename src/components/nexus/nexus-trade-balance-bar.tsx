"use client";

import { Coins } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { useAccount, useBalance } from "wagmi";
import { BSC_CHAIN_ID, BSC_CHAIN_LABEL } from "@/lib/bsc-chain";
import { useAgentWallet } from "@/hooks/use-agent-wallet";
import type { DemoPosition } from "@/lib/storage";

export function NexusTradeBalanceBar({
  symbol,
  position,
  onChainBalance,
  markPriceUsd,
  showAgentVault = false,
}: {
  symbol?: string;
  position?: DemoPosition | null;
  /** Live ERC-20 balance on BSC Testnet (replaces demo ledger) */
  onChainBalance?: number;
  markPriceUsd?: number;
  showAgentVault?: boolean;
}) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address, chainId: BSC_CHAIN_ID });
  const { wallet: agentWallet, usdcBalance: agentUsdc, loading: agentLoading } = useAgentWallet();

  const walletBnb = balance ? Number(balance.formatted) : 0;

  if (!isConnected) {
    return (
      <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
        Connect wallet on {BSC_CHAIN_LABEL} to trade.
      </p>
    );
  }

  return (
    <div className={`grid gap-2 ${showAgentVault ? "sm:grid-cols-2" : ""}`}>
      <div className="arc-glass-card arc-glass-card-nexus rounded-xl border border-amber-400/25 px-3 py-2.5">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-200/80">
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.wallet} theme="nexus" size="sm" className="!h-8 !w-8" />
          Your wallet
        </p>
        <p className="mt-1 text-lg font-bold text-white">{walletBnb.toFixed(4)} tBNB</p>
      </div>
      {showAgentVault && (
        <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-200/80">
            <Coins className="h-3.5 w-3.5" />
            Agent vault (trades)
          </p>
          <p className="mt-1 text-lg font-bold text-white">
            {agentLoading ? "…" : `$${agentUsdc.toFixed(2)} vault`}
          </p>
          {agentWallet?.address && (
            <p className="mt-0.5 truncate text-[9px] text-white/40">{agentWallet.address}</p>
          )}
        </div>
      )}
      {(onChainBalance != null && onChainBalance > 0 && symbol) || (position && position.tokenAmount > 0 && symbol) ? (
        <div className="col-span-full rounded-xl border border-white/10 bg-black/25 px-3 py-2">
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/45">
            <ArcIcon3d icon={NEXUS_TRADE_ICONS.holdings} theme="nexus" size="sm" className="!h-8 !w-8" />
            Holding {symbol} on-chain
          </p>
          <p className="text-sm font-semibold text-white tabular-nums">
            {(onChainBalance ?? position?.tokenAmount ?? 0).toFixed(4)} {symbol}
          </p>
        </div>
      ) : null}
    </div>
  );
}
