"use client";

import { Radio, Sparkles } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { cn } from "@/lib/utils";
import { ALPHA_TAB_SUBTITLE, LIVE_FEED_INTRO } from "@/lib/nexus-copy";
import { NEXUS_TRADE_ICONS } from "@/lib/nexus-trade-icons";

export type NexusFeedTab = "live" | "alpha" | "swap";

export function NexusFeedTabs({
  active,
  onChange,
  alphaCount,
}: {
  active: NexusFeedTab;
  onChange: (tab: NexusFeedTab) => void;
  alphaCount: number;
}) {
  const tabs = [
    { id: "live" as const, label: "Live Feed", icon: Radio, theme: "nexus" as const, delay: 0 },
    { id: "alpha" as const, label: `Alpha (${alphaCount})`, icon: Sparkles, theme: "nexus" as const, delay: 0.1 },
    { id: "swap" as const, label: "Swap", icon: NEXUS_TRADE_ICONS.swap, theme: "nexus" as const, delay: 0.2 },
  ];

  return (
    <div className="mb-3 space-y-2">
      <div className="arc-tab-bar arc-tab-bar--grid-3 w-full">
        {tabs.map(({ id, label, icon: Icon, theme, delay }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn("arc-tab-item w-full", active === id && "arc-tab-item-active")}
          >
            <ArcIcon3d icon={Icon} theme={theme} size="sm" delay={delay} className="!h-7 !w-7 shrink-0" />
            {label}
          </button>
        ))}
      </div>
      <p className="text-[11px] leading-snug text-white/45">
        {active === "live"
          ? LIVE_FEED_INTRO
          : active === "alpha"
            ? ALPHA_TAB_SUBTITLE
            : "Quick swap from the trading desk"}
      </p>
    </div>
  );
}
