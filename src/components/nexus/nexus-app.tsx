"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { NexusConsole } from "@/components/nexus/nexus-console";
import type { GateHandoff } from "@/components/nexus/nexus-gate-banner";
import {
  clampGateLeverage,
  parseGateAction,
  parseGateDirection,
  saveGateExecutionIntent,
} from "@/lib/gate-execution-intent";

function NexusWithHandoff() {
  const searchParams = useSearchParams();

  const initialGateHandoff = useMemo((): GateHandoff | null => {
    if (searchParams.get("from") !== "gate") return null;
    const symbol = searchParams.get("symbol")?.toUpperCase();
    if (!symbol) return null;
    const permit = searchParams.get("permit");
    const scroll = searchParams.get("scroll");
    const action = parseGateAction(searchParams.get("action"));
    const direction = parseGateDirection(searchParams.get("direction"));
    const leverage = clampGateLeverage(Number(searchParams.get("leverage") ?? 1));
    const autoStart = searchParams.get("auto") === "1";

    const handoff: GateHandoff = {
      symbol,
      permit: permit === "GRANT" || permit === "DENY" ? permit : undefined,
      permitId: searchParams.get("permitId") ?? undefined,
      scroll: scroll === "constitution" || scroll === "trade" ? scroll : undefined,
      action,
      direction,
      leverage,
      autoStart,
    };

    if (direction || action || leverage > 1) {
      saveGateExecutionIntent({
        symbol,
        direction: direction ?? "FLAT",
        leverage,
        action,
        permit: handoff.permit,
        permitId: handoff.permitId,
        autoStart,
      });
    }

    return handoff;
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
