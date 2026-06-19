/**
 * Autonomous desk engine — deterministic, not predictive.
 * Combines live CMC gate consensus, market pulse, cascade safety, and derivatives context.
 */

import { fundingDirectionBias } from "@/lib/binance-derivatives-context";
import type { BinanceDerivativesSnapshot } from "@/lib/binance-derivatives-context";
import type { GateJudgeConsensus } from "@/lib/gate-consensus-payload";
import { isGateSymbol } from "@/lib/gate-constants";
import { gateSymbolTradableOnTestnet } from "@/lib/gate-product-copy";
import type { MarketPulse } from "@/lib/market-pulse";
import type { PositionDirection, PositionRoute } from "@/lib/position-router";

export type AutopilotVenue = "spot" | "futures";

export type AutopilotDeskAction = "OPEN_LONG" | "OPEN_SHORT" | "EXIT" | "HOLD";

export type FuturesDeskAction = "long" | "short" | "close" | "hold";

export type AutopilotDeskLayer = {
  id: string;
  label: string;
  source: string;
  status: "pass" | "warn" | "block" | "neutral";
  detail: string;
};

export type AutopilotExecutePlan = {
  tradeThisCycle: boolean;
  spotSide: "buy" | "sell" | "hold";
  hedgeToStable: boolean;
  requiresPermit: boolean;
  futuresSignal: FuturesDeskAction;
  executeOnChain: boolean;
  venueNote: string;
  /** Spot thesis size multiplier applied this cycle */
  spotThesisLeverage?: number;
  /** Futures perp leverage hint for external venue */
  futuresLeverage?: number;
  /** Futures margin % of budget per signal */
  marginPercent?: number;
};

export type AutopilotDeskCycle = {
  ok: boolean;
  schema: "meridian-autopilot-desk/v1";
  symbol: string;
  venue: AutopilotVenue;
  action: AutopilotDeskAction;
  direction: PositionDirection;
  confidence: number;
  thesis: string;
  notPrediction: true;
  method: string;
  dataSources: string[];
  layers: AutopilotDeskLayer[];
  consensus: GateJudgeConsensus | null;
  pulse: Pick<
    MarketPulse,
    "stressScore" | "cascadeLevel" | "agentStance" | "headline" | "fearGreed"
  > | null;
  derivatives: Pick<
    BinanceDerivativesSnapshot,
    "fundingRatePct" | "markPrice" | "openInterestUsd" | "source"
  > | null;
  execute: AutopilotExecutePlan;
  generatedAt: string;
};

/** Map desk action + venue into executable plan (honest Chapel vs futures limits). */
export function buildAutopilotExecutePlan(input: {
  action: AutopilotDeskAction;
  venue: AutopilotVenue;
  symbol: string;
  route: PositionRoute;
  hasPosition: boolean;
  consensus: GateJudgeConsensus | null;
  spotThesisLeverage?: number;
  futuresLeverage?: number;
  marginPercent?: number;
}): AutopilotExecutePlan {
  const sym = input.symbol.toUpperCase();
  const tradable = gateSymbolTradableOnTestnet(sym);
  const permitOk = input.consensus?.permit?.status === "GRANT";
  const spotLev = input.spotThesisLeverage ?? 1;
  const futLev = input.futuresLeverage ?? 1;
  const marginPct = input.marginPercent ?? 25;

  if (input.venue === "futures") {
    let futuresSignal: FuturesDeskAction = "hold";
    if (input.action === "OPEN_LONG") futuresSignal = "long";
    else if (input.action === "OPEN_SHORT") futuresSignal = "short";
    else if (input.action === "EXIT") futuresSignal = "close";

    const sizing =
      futuresSignal !== "hold"
        ? ` · ${futLev}× leverage · ${marginPct}% margin budget`
        : "";

    return {
      tradeThisCycle: futuresSignal !== "hold",
      spotSide: "hold",
      hedgeToStable: false,
      requiresPermit: false,
      futuresSignal,
      executeOnChain: false,
      futuresLeverage: futLev,
      marginPercent: marginPct,
      venueNote:
        `Futures signal${sizing} — Binance USD-M funding/OI context. No perp on Chapel; execute on your perp venue.`,
    };
  }

  if (input.action === "HOLD") {
    return {
      tradeThisCycle: false,
      spotSide: "hold",
      hedgeToStable: false,
      requiresPermit: false,
      futuresSignal: "hold",
      executeOnChain: false,
      spotThesisLeverage: spotLev,
      venueNote: "Hold flat — no spot size change this cycle.",
    };
  }

  if (input.action === "OPEN_LONG") {
    const blocked = isGateSymbol(sym) && !permitOk;
    const levNote = spotLev > 1 ? ` · ${spotLev}× thesis size` : "";
    return {
      tradeThisCycle: tradable && !blocked,
      spotSide: tradable && !blocked ? "buy" : "hold",
      hedgeToStable: false,
      requiresPermit: isGateSymbol(sym),
      futuresSignal: "hold",
      executeOnChain: tradable && !blocked,
      spotThesisLeverage: spotLev,
      venueNote: blocked
        ? `Consensus permit DENY — ${input.consensus?.permit?.reason ?? "skill stack not aligned"}.`
        : tradable
          ? `Spot long${levNote} · wallet Buy tBNB → asset on PancakeSwap Chapel.`
          : `${sym} not on Chapel desk — evaluate only.`,
    };
  }

  if (input.action === "OPEN_SHORT" || input.action === "EXIT") {
    if (!input.hasPosition) {
      return {
        tradeThisCycle: false,
        spotSide: "hold",
        hedgeToStable: false,
        requiresPermit: false,
        futuresSignal: "hold",
        executeOnChain: false,
        venueNote: "Exit/short signal but no on-chain position — stay flat.",
      };
    }
    const hedge = input.action === "OPEN_SHORT" && input.route.execution.kind === "short_stable";
    return {
      tradeThisCycle: tradable,
      spotSide: tradable ? "sell" : "hold",
      hedgeToStable: hedge,
      requiresPermit: false,
      futuresSignal: "hold",
      executeOnChain: tradable,
      venueNote: hedge
        ? "Spot short bias · rotate asset → USDC on Chapel (not Binance perp)."
        : "Spot exit · sell asset → tBNB on Chapel.",
    };
  }

  return {
    tradeThisCycle: false,
    spotSide: "hold",
    hedgeToStable: false,
    requiresPermit: false,
    futuresSignal: "hold",
    executeOnChain: false,
    venueNote: "No action.",
  };
}

/** Live tape dumping — block spot buys and reckless futures entries. */
export function isDumpingTape(
  pulse: MarketPulse,
  consensus: GateJudgeConsensus | null,
): boolean {
  if (pulse.agentStance === "DE_RISK") return true;
  if (pulse.cascadeLevel === "elevated" || pulse.cascadeLevel === "extreme") return true;
  if ((pulse.marketCapChange24h ?? 0) < -1.5) return true;
  if ((pulse.btcChange24h ?? 0) < -2.5) return true;
  if ((consensus?.weights.bearPct ?? 0) >= 45) return true;
  return false;
}

/** Tape supportive for selective longs — not a prediction, rule on live macro. */
export function isSupportiveTape(pulse: MarketPulse): boolean {
  if (pulse.agentStance === "DE_RISK") return false;
  if (pulse.cascadeLevel !== "normal") return false;
  if (pulse.stressScore >= 55) return false;
  return pulse.agentStance === "LONG" || (pulse.marketCapChange24h ?? 0) > -0.5;
}

/** Deterministic desk cycle — rules on live data, not forecasts. */
export function evaluateAutopilotDesk(input: {
  symbol: string;
  venue: AutopilotVenue;
  hasPosition: boolean;
  route: PositionRoute;
  pulse: MarketPulse;
  consensus: GateJudgeConsensus | null;
  derivatives: BinanceDerivativesSnapshot | null;
  spotThesisLeverage?: number;
  futuresLeverage?: number;
  marginPercent?: number;
}): AutopilotDeskCycle {
  const sym = input.symbol.toUpperCase();
  const { route, pulse, consensus, derivatives, venue, hasPosition } = input;

  const layers: AutopilotDeskLayer[] = [
    {
      id: "consensus",
      label: "CMC skill consensus",
      source: "meridian-skills.mjs · live CMC batch",
      status: consensus?.cleared ? "pass" : consensus?.constitutionOnly ? "warn" : "neutral",
      detail: consensus
        ? `${consensus.deskSignal.replace(/_/g, " ")} · permit ${consensus.permit.status} · ${consensus.weights.longPct}/${consensus.weights.holdPct}/${consensus.weights.bearPct} L/H/B`
        : "Non-gate symbol — pulse + route only",
    },
    {
      id: "gate-route",
      label: "Position route",
      source: "position-router.ts",
      status: route.direction === "LONG" ? "pass" : route.direction === "SHORT" ? "warn" : "neutral",
      detail: `${route.direction} · ${route.execution.path}`,
    },
    {
      id: "pulse",
      label: "Market pulse",
      source: pulse.dataSources.join(" · ") || "CMC global",
      status:
        pulse.cascadeLevel === "extreme" ? "block" : pulse.cascadeLevel === "elevated" ? "warn" : "pass",
      detail: `${pulse.headline} · stress ${pulse.stressScore}/100`,
    },
  ];

  if (derivatives) {
    const fb = fundingDirectionBias(derivatives.fundingRate);
    layers.push({
      id: "funding",
      label: "Perp funding / OI",
      source: derivatives.source,
      status: fb === "long_crowded" ? "warn" : "neutral",
      detail: `Funding ${derivatives.fundingRatePct}${
        derivatives.openInterestUsd != null
          ? ` · OI ~$${Math.round(derivatives.openInterestUsd / 1e6)}M`
          : ""
      }${venue === "futures" ? " · futures desk" : " · macro on spot"}`,
    });
  }

  let action: AutopilotDeskAction = "HOLD";
  let thesis = `${sym}: hold flat — desk rules not aligned on this bar.`;

  const deskSignal = consensus?.deskSignal ?? route.gate?.signal ?? "HOLD";

  if (pulse.cascadeLevel === "extreme" && hasPosition) {
    action = "EXIT";
    thesis = `${sym}: extreme cascade (${pulse.stressScore}/100) — exit risk from live tape, not a prediction.`;
  } else if (route.direction === "SHORT" && hasPosition) {
    action = "OPEN_SHORT";
    thesis = `${sym}: ${route.verdict}`;
  } else if (route.direction === "LONG" && consensus?.cleared) {
    action = "OPEN_LONG";
    thesis = `${sym}: consensus cleared · ${consensus.votes.long}/${consensus.votes.total} layers long · ${consensus.alignmentScore}/100 · ${route.verdict}`;
  } else if (
    venue === "futures" &&
    route.direction === "SHORT" &&
    !hasPosition &&
    !isDumpingTape(pulse, consensus)
  ) {
    action = "OPEN_SHORT";
    thesis = `${sym}: futures short setup · ${route.verdict}`;
  } else if (
    venue === "futures" &&
    route.direction === "LONG" &&
    consensus?.cleared &&
    !isDumpingTape(pulse, consensus)
  ) {
    action = "OPEN_LONG";
    thesis = `${sym}: futures long setup · consensus cleared · ${route.verdict}`;
  } else if (consensus?.constitutionOnly) {
    action = "HOLD";
    thesis = `${sym}: constitution-only split — ${consensus.permit.reason}`;
  } else if (
    hasPosition &&
    (deskSignal === "EXIT" ||
      deskSignal === "AVOID" ||
      (consensus?.blockers?.length ?? 0) > 0 ||
      pulse.cascadeLevel === "elevated")
  ) {
    action = pulse.cascadeLevel === "elevated" && route.direction !== "LONG" ? "EXIT" : "EXIT";
    thesis = `${sym}: ${consensus?.blockers?.[0] ?? deskSignal.replace(/_/g, " ")} · de-risk spot.`;
  } else if (route.direction === "LONG" && isGateSymbol(sym) && !consensus?.cleared) {
    action = "HOLD";
    thesis = `${sym}: lean long but no consensus permit — ${consensus?.permit?.reason ?? "wait"}.`;
  } else if (route.direction === "FLAT") {
    action = "HOLD";
    thesis = `${sym}: ${route.verdict}`;
  }

  if (venue === "futures" && action === "OPEN_LONG" && derivatives) {
    if (fundingDirectionBias(derivatives.fundingRate) === "long_crowded") {
      action = "HOLD";
      thesis = `${sym}: long setup but crowded funding ${derivatives.fundingRatePct} — futures desk waits.`;
    }
  }

  if (venue === "futures" && action === "OPEN_SHORT" && derivatives) {
    if (fundingDirectionBias(derivatives.fundingRate) === "short_crowded") {
      action = "HOLD";
      thesis = `${sym}: short setup but crowded negative funding ${derivatives.fundingRatePct} — wait.`;
    }
  }

  if (action === "OPEN_LONG" && isDumpingTape(pulse, consensus)) {
    action = "HOLD";
    thesis = `${sym}: tape dumping / elevated stress — skip buy this check (agent still monitoring).`;
    layers.push({
      id: "tape-guard",
      label: "Tape guard",
      source: "market-pulse.ts",
      status: "block",
      detail: `${pulse.headline} · stress ${pulse.stressScore}/100 · no buy on dump`,
    });
  } else if (action === "OPEN_LONG" && venue === "spot" && !isSupportiveTape(pulse)) {
    action = "HOLD";
    thesis = `${sym}: macro not supportive for spot entry — wait for clearer tape.`;
    layers.push({
      id: "tape-guard",
      label: "Tape guard",
      source: "market-pulse.ts",
      status: "warn",
      detail: pulse.headline,
    });
  }

  const execute = buildAutopilotExecutePlan({
    action,
    venue,
    symbol: sym,
    route,
    hasPosition,
    consensus,
    spotThesisLeverage: 1,
    futuresLeverage: input.futuresLeverage,
    marginPercent: input.marginPercent,
  });

  const dataSources = [
    "coinmarketcap/quotes",
    "coinmarketcap/fear-and-greed",
    "meridian/gate-engine",
    "meridian/skill-consensus",
    "meridian/market-pulse",
  ];
  if (derivatives) dataSources.push(derivatives.source);

  return {
    ok: true,
    schema: "meridian-autopilot-desk/v1",
    symbol: sym,
    venue,
    action,
    direction: route.direction,
    confidence: route.confidence,
    thesis,
    notPrediction: true,
    method:
      "Interval = market check. Trade only when CMC consensus + pulse + funding align — not every tick.",
    dataSources,
    layers,
    consensus,
    pulse: {
      stressScore: pulse.stressScore,
      cascadeLevel: pulse.cascadeLevel,
      agentStance: pulse.agentStance,
      headline: pulse.headline,
      fearGreed: pulse.fearGreed,
    },
    derivatives: derivatives
      ? {
          fundingRatePct: derivatives.fundingRatePct,
          markPrice: derivatives.markPrice,
          openInterestUsd: derivatives.openInterestUsd,
          source: derivatives.source,
        }
      : null,
    execute,
    generatedAt: new Date().toISOString(),
  };
}
