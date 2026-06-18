"use client";

import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { NexusConsole } from "@/components/nexus/nexus-console";
import { matchTestnetDeskBySymbol } from "@/lib/testnet-onchain";
import { useBnbSpotUsd } from "@/hooks/use-bnb-spot-usd";
import type { GateHandoff } from "@/components/nexus/nexus-gate-banner";

function NexusGateBootstrap({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const bnbSpotUsd = useBnbSpotUsd();
  const applied = useRef(false);

  const handoff = useMemo((): GateHandoff | null => {
    if (searchParams.get("from") !== "gate") return null;
    const symbol = searchParams.get("symbol")?.toUpperCase();
    if (!symbol) return null;
    const permit = searchParams.get("permit");
    return {
      symbol,
      permit: permit === "GRANT" || permit === "DENY" ? permit : undefined,
      permitId: searchParams.get("permitId") ?? undefined,
    };
  }, [searchParams]);

  useEffect(() => {
    if (!handoff || applied.current) return;
    applied.current = true;
    const desk = matchTestnetDeskBySymbol(handoff.symbol, bnbSpotUsd);
    if (desk && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("meridian-gate-handoff", {
          detail: { handoff, deskToken: desk, tab: searchParams.get("tab") ?? "trade" },
        }),
      );
    }
  }, [handoff, bnbSpotUsd, searchParams]);

  return <>{children}</>;
}

export function NexusApp() {
  return (
    <Suspense fallback={<NexusConsole />}>
      <NexusGateBootstrap>
        <NexusConsole />
      </NexusGateBootstrap>
    </Suspense>
  );
}
