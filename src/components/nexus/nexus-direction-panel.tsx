"use client";

import { usePositionRoute } from "@/hooks/use-position-route";
import { useConstitution } from "@/contexts/nexus-constitution-context";
import { NexusDirectionDesk } from "@/components/nexus/nexus-direction-desk";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

export function NexusDirectionPanel({
  token,
  hasRiskPosition,
  agentAction,
  strategyOnly = true,
}: {
  token: TrendingMarketToken | null;
  hasRiskPosition?: boolean;
  agentAction?: string;
  /** Read-only strategy stack — no duplicate Buy/Sell (wallet column only) */
  strategyOnly?: boolean;
}) {
  const sym = token?.symbol?.replace(/^\$/, "").toUpperCase();
  const { route, loading } = usePositionRoute(sym, {
    hasPosition: hasRiskPosition,
    agentAction,
  });

  if (!sym) return null;

  return (
    <NexusDirectionDesk route={route} loading={loading} strategyOnly={strategyOnly} />
  );
}
