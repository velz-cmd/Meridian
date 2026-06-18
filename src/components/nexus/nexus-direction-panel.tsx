"use client";

import { usePositionRoute } from "@/hooks/use-position-route";
import { useConstitution } from "@/contexts/nexus-constitution-context";
import { NexusDirectionDesk } from "@/components/nexus/nexus-direction-desk";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

export function NexusDirectionPanel({
  token,
  hasRiskPosition,
  agentAction,
  onBuySpot,
  onSellSpot,
}: {
  token: TrendingMarketToken | null;
  hasRiskPosition?: boolean;
  agentAction?: string;
  onBuySpot?: () => void;
  onSellSpot?: () => void;
}) {
  const sym = token?.symbol?.replace(/^\$/, "").toUpperCase();
  const { route, loading } = usePositionRoute(sym, {
    hasPosition: hasRiskPosition,
    agentAction,
  });
  const { canExecuteBuy } = useConstitution();

  if (!sym) return null;

  return (
    <NexusDirectionDesk
      route={route}
      loading={loading}
      onBuySpot={onBuySpot}
      onSellSpot={onSellSpot}
      canBuySpot={canExecuteBuy}
      canSellSpot={Boolean(hasRiskPosition) || route?.spotAction === "sell"}
    />
  );
}
