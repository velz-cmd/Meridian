"use client";

import { Radio, Sparkles } from "lucide-react";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { nexusActionGlass } from "@/lib/nexus-action-glass";
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
  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange("live")}
        className={nexusActionGlass(
          "live",
          active === "live",
          "arc-btn-pill relative z-[1] flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold",
        )}
      >
        <ArcIcon3d icon={Radio} theme="nexus" size="sm" />
        Live Feed
      </button>
      <button
        type="button"
        onClick={() => onChange("alpha")}
        className={nexusActionGlass(
          "alpha",
          active === "alpha",
          "arc-btn-pill relative z-[1] flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold",
        )}
      >
        <ArcIcon3d icon={Sparkles} theme="nexus" size="sm" delay={0.1} />
        Alpha ({alphaCount})
      </button>
      <button
        type="button"
        onClick={() => onChange("swap")}
        className={nexusActionGlass(
          "swap",
          active === "swap",
          "arc-btn-pill relative z-[1] flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold",
        )}
      >
        <ArcIcon3d icon={NEXUS_TRADE_ICONS.swap} theme="nexus" size="sm" delay={0.2} />
        Swap
      </button>
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
