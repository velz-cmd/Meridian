"use client";

import { NexusTokenAvatar } from "@/components/nexus/nexus-token-avatar";
import { buildBscTestnetTradeTokens } from "@/lib/testnet-onchain";
import { useBnbSpotUsd } from "@/hooks/use-bnb-spot-usd";
import { cn } from "@/lib/utils";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { BSC_CHAIN_LABEL } from "@/lib/bsc-chain";

export function NexusTestnetDeskStrip({
  selected,
  onSelect,
  className,
}: {
  selected?: TrendingMarketToken | null;
  onSelect: (token: TrendingMarketToken) => void;
  className?: string;
}) {
  const bnbSpot = useBnbSpotUsd();
  const desk = buildBscTestnetTradeTokens(bnbSpot);

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70">
        BSC Testnet desk · {BSC_CHAIN_LABEL}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {desk.map((t) => {
          const active =
            selected?.tokenAddress.toLowerCase() === t.tokenAddress.toLowerCase() &&
            String(selected.chainId) === String(t.chainId);
          return (
            <button
              key={t.tokenAddress}
              type="button"
              onClick={() => onSelect(t)}
              className={cn(
                "inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
                active
                  ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-100"
                  : "border-white/12 bg-black/30 text-white/75 hover:border-emerald-400/30 hover:bg-emerald-500/10",
              )}
            >
              <NexusTokenAvatar symbol={t.symbol} icon={t.icon} size="sm" />
              {t.symbol}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-white/40">On-chain swaps via PancakeSwap — wallet signs every tx.</p>
    </div>
  );
}
