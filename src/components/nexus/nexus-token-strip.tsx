"use client";

import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";
import { NexusTokenAvatar } from "@/components/nexus/nexus-token-avatar";
import { Layers } from "lucide-react";
import { cn, formatUsd } from "@/lib/utils";

export function NexusTokenStrip({
  tokens,
  selected,
  onSelect,
  mobileLimit = 40,
  compact = false,
}: {
  tokens: TrendingMarketToken[];
  selected: TrendingMarketToken | null;
  onSelect: (t: TrendingMarketToken) => void;
  mobileLimit?: number;
  /** Slim strip for desktop center column */
  compact?: boolean;
}) {
  if (tokens.length === 0) return null;

  const list = tokens.slice(0, mobileLimit);

  return (
    <div
      className={cn(
        "nexus-token-strip-shell",
        compact ? "p-2" : "p-2.5 max-lg:sticky max-lg:top-[7.5rem] max-lg:z-20 max-lg:bg-[#050508]/95 max-lg:backdrop-blur-md",
      )}
    >
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">
        Switch token · {list.length}
        {tokens.length > list.length ? ` of ${tokens.length}` : ""} live
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:thin] [scrollbar-color:rgba(168,85,247,0.35)_transparent]">
        {list.map((t) => {
          const sym = t.symbol.replace(/^\$/, "").trim().toUpperCase();
          const selSym = selected?.symbol.replace(/^\$/, "").trim().toUpperCase();
          const active =
            (selected && selSym === sym && selected.chainId === t.chainId) ||
            (selected?.tokenAddress.toLowerCase() === t.tokenAddress.toLowerCase() &&
              selected.chainId === t.chainId);
          return (
            <button
              key={`${t.chainId}:${t.tokenAddress}`}
              type="button"
              onClick={() => onSelect(t)}
              className={cn(
                "nexus-token-chip flex shrink-0 snap-start text-left active:scale-95",
                compact ? "min-w-[72px] flex-row items-center gap-2 px-2 py-1.5" : "min-w-[92px] flex-col px-3 py-2.5",
                active && "nexus-token-chip-active",
              )}
            >
              <NexusTokenAvatar
                symbol={t.symbol}
                icon={t.icon}
                size="sm"
                className={cn("shrink-0", compact ? "!h-6 !w-6" : "mb-1.5 !h-7 !w-7")}
              />
              <span className={compact ? "text-xs font-bold text-white" : "text-sm font-bold text-white"}>{t.symbol}</span>
              {!compact && <span className="text-[10px] text-white/55">{formatUsd(t.priceUsd)}</span>}
              {t.agent && !compact && (
                <span
                  className={`mt-1 text-[9px] font-bold uppercase ${
                    t.agent.action === "BUY"
                      ? "text-emerald-300"
                      : t.agent.action === "SELL"
                        ? "text-rose-300"
                        : "text-amber-200"
                  }`}
                >
                  {t.agent.action}
                </span>
              )}
              {t.agent && compact && (
                <span
                  className={cn(
                    "ml-auto h-1.5 w-1.5 shrink-0 rounded-full",
                    t.agent.action === "BUY" && "bg-emerald-400",
                    t.agent.action === "SELL" && "bg-rose-400",
                    t.agent.action === "HOLD" && "bg-amber-300",
                  )}
                  title={t.agent.action}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
