/**
 * Server orchestrator — fetch live data then run deterministic desk engine.
 */

import {
  evaluateAutopilotDesk,
  type AutopilotDeskCycle,
  type AutopilotVenue,
} from "@/lib/autopilot-desk-engine";
import { fetchBinanceDerivativesContext } from "@/lib/binance-derivatives-context";
import { extractJudgeConsensus } from "@/lib/gate-consensus-payload";
import { fetchGateRoutePayload } from "@/lib/gate-pulse-bridge";
import { buildMarketPulse } from "@/lib/market-pulse";
import { buildPositionRoute } from "@/lib/position-router";

export async function runAutopilotDeskCycle(input: {
  symbol: string;
  venue?: AutopilotVenue;
  hasPosition?: boolean;
}): Promise<AutopilotDeskCycle> {
  const sym = input.symbol.toUpperCase();
  const venue = input.venue ?? "spot";
  const hasPosition = input.hasPosition ?? false;

  const [pulse, derivatives, gateRow] = await Promise.all([
    buildMarketPulse(sym),
    fetchBinanceDerivativesContext(sym),
    fetchGateRoutePayload(sym),
  ]);

  const consensus = gateRow ? extractJudgeConsensus(gateRow.skills as never) : null;
  const compositeSignal =
    (gateRow?.skills as { composite?: { signal?: string } } | undefined)?.composite?.signal ??
    gateRow?.gate.signal ??
    pulse.gateSignal ??
    "HOLD";

  const gate = gateRow
    ? {
        signal: compositeSignal,
        tier: gateRow.gate.tier,
        confidence:
          (gateRow.skills as { composite?: { alignmentScore?: number } } | undefined)?.composite
            ?.alignmentScore ?? gateRow.gate.confidence,
        checksPassed: gateRow.gate.checksPassed,
        checksTotal: gateRow.gate.checksTotal,
        regime: gateRow.gate.regime,
      }
    : pulse.gateSignal
      ? {
          signal: pulse.gateSignal,
          tier: pulse.gateTier ?? "—",
          confidence: undefined,
          regime: pulse.macro?.label ?? undefined,
        }
      : null;

  const route = buildPositionRoute({
    symbol: sym,
    pulse,
    derivatives,
    hasRiskPosition: hasPosition,
    gate,
  });

  return evaluateAutopilotDesk({
    symbol: sym,
    venue,
    hasPosition,
    route,
    pulse,
    consensus,
    derivatives,
  });
}
