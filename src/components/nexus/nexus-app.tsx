"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { NexusConsole } from "@/components/nexus/nexus-console";
import type { GateHandoff } from "@/components/nexus/nexus-gate-banner";

function NexusWithHandoff() {
  const searchParams = useSearchParams();

  const initialGateHandoff = useMemo((): GateHandoff | null => {
    if (searchParams.get("from") !== "gate") return null;
    const symbol = searchParams.get("symbol")?.toUpperCase();
    if (!symbol) return null;
    const permit = searchParams.get("permit");
    const scroll = searchParams.get("scroll");
    return {
      symbol,
      permit: permit === "GRANT" || permit === "DENY" ? permit : undefined,
      permitId: searchParams.get("permitId") ?? undefined,
      scroll: scroll === "constitution" || scroll === "trade" ? scroll : undefined,
    };
  }, [searchParams]);

  return <NexusConsole initialGateHandoff={initialGateHandoff} />;
}

export function NexusApp() {
  return (
    <Suspense fallback={<NexusConsole />}>
      <NexusWithHandoff />
    </Suspense>
  );
}
