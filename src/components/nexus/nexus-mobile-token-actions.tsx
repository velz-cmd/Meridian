"use client";

import { useState } from "react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { nexusActionGlass } from "@/lib/nexus-action-glass";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";
import { NexusTokenChatPanel } from "@/components/nexus/nexus-token-chat";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

/** Intelligence toolbar — Autopilot + Chat only; manual Buy/Sell live in Wallet column. */
export function NexusMobileTokenActions({
  token,
  onOpenAutopilot,
  activeTab = "buy",
}: {
  token: TrendingMarketToken;
  onOpenAutopilot?: () => void;
  activeTab?: "buy" | "sell" | "agent";
}) {
  const [chatOpen, setChatOpen] = useState(false);

  const chip =
    "relative z-[1] flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 active:scale-[0.98]";

  return (
    <>
      <div className="grid grid-cols-2 gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => onOpenAutopilot?.()}
          className={nexusActionGlass("autopilot", activeTab === "agent", chip)}
        >
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.autopilot} theme="home" size="sm" className="!h-8 !w-8" />
          <span className="text-[10px] font-bold">Autopilot</span>
          <span className="text-[8px] font-medium text-white/40">Autonomous agent</span>
        </button>
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className={nexusActionGlass("alpha", false, chip)}
        >
          <ArcIcon3d icon={NEXUS_TRADE_ICONS.chat} theme="nexus" size="sm" className="!h-8 !w-8" />
          <span className="text-[10px] font-bold">Chat</span>
          <span className="text-[8px] font-medium text-white/40">Ask the desk</span>
        </button>
      </div>
      {chatOpen && (
        <NexusTokenChatPanel
          token={token}
          onClose={() => setChatOpen(false)}
          onOpenTrade={(tab) => {
            setChatOpen(false);
            if (tab === "agent") onOpenAutopilot?.();
          }}
        />
      )}
    </>
  );
}
