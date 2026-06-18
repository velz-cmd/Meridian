/**
 * Spot-native direction router — LONG / FLAT / SHORT-via-stable on BSC Testnet.
 * SHORT = rotate risk asset → USDC (PancakeSwap), not synthetic perp PnL.
 */

import type { BinanceDerivativesSnapshot } from "./binance-derivatives-context";
import { fundingDirectionBias } from "./binance-derivatives-context";
import type { MarketPulse } from "./market-pulse";
import { gateSymbolTradableOnTestnet } from "./gate-product-copy";
import { isGateSymbol } from "./gate-constants";

export type PositionDirection = "LONG" | "SHORT" | "FLAT";

export type PositionExecutionKind = "none" | "long_tbnb" | "short_stable" | "exit_tbnb";

export type PositionExecution = {
  kind: PositionExecutionKind;
  side: "buy" | "sell" | "rotate" | "hold";
  /** Human-readable PancakeSwap path on BSC Testnet */
  path: string;
  payAsset: string;
  receiveAsset: string;
  tradable: boolean;
  requiresPermit: boolean;
};

export type PositionRoute = {
  ok: boolean;
  symbol: string;
  direction: PositionDirection;
  confidence: number;
  execution: PositionExecution;
  reasoning: string[];
  pulse: MarketPulse;
  derivatives: BinanceDerivativesSnapshot | null;
  settlement: {
    network: string;
    venue: string;
    note: string;
  };
  generatedAt: string;
};

function dirConfidence(
  direction: PositionDirection,
  pulse: MarketPulse,
  gateTier?: string,
): number {
  let c = pulse.stressScore != null ? 55 : 50;
  if (direction === "LONG") {
    c = pulse.gateTier === "a-plus" ? 78 : pulse.gateTier === "a" ? 68 : 58;
    c -= pulse.cascadeLevel === "elevated" ? 12 : 0;
  } else if (direction === "SHORT") {
    c = pulse.cascadeLevel === "extreme" ? 82 : pulse.cascadeLevel === "elevated" ? 72 : 62;
    if (pulse.gateSignal === "EXIT" || pulse.gateSignal === "AVOID") c += 8;
  } else {
    c = 52;
  }
  if (gateTier === "a-plus" && direction === "LONG") c += 4;
  return Math.round(Math.min(92, Math.max(38, c)));
}

export function resolvePositionDirection(input: {
  pulse: MarketPulse;
  derivatives?: BinanceDerivativesSnapshot | null;
  agentAction?: "BUY" | "SELL" | "HOLD" | null;
}): PositionDirection {
  const { pulse, derivatives, agentAction } = input;
  const gate = pulse.gateSignal ?? "";
  const fg = pulse.fearGreed ?? 50;

  const fundingBias = derivatives ? fundingDirectionBias(derivatives.fundingRate) : null;

  if (
    pulse.cascadeLevel === "extreme" ||
    gate === "EXIT" ||
    gate === "AVOID" ||
    agentAction === "SELL"
  ) {
    return "SHORT";
  }

  if (
    pulse.cascadeLevel === "elevated" ||
    pulse.macro?.label === "risk-off" ||
    (fg < 25 && pulse.stressScore >= 40) ||
    fundingBias === "long_crowded"
  ) {
    if (gate === "ENTER_LONG" && pulse.cascadeLevel !== "elevated") {
      return "FLAT";
    }
    return pulse.stressScore >= 50 ? "SHORT" : "FLAT";
  }

  if (gate === "ENTER_LONG" && pulse.agentStance === "LONG") {
    return "LONG";
  }

  if (agentAction === "BUY" && pulse.cascadeLevel === "normal" && fg <= 88) {
    return "LONG";
  }

  return "FLAT";
}

export function buildPositionExecution(
  direction: PositionDirection,
  symbol: string,
  hasRiskPosition: boolean,
): PositionExecution {
  const sym = symbol.toUpperCase();
  const tradable = gateSymbolTradableOnTestnet(sym);
  const bench = isGateSymbol(sym);

  if (direction === "LONG") {
    return {
      kind: "long_tbnb",
      side: "buy",
      path: tradable ? `tBNB → ${sym} (PancakeSwap V2 · Chapel)` : `${sym} — research only on desk`,
      payAsset: "tBNB",
      receiveAsset: sym,
      tradable,
      requiresPermit: bench,
    };
  }

  if (direction === "SHORT") {
    if (hasRiskPosition && tradable) {
      return {
        kind: "short_stable",
        side: "rotate",
        path: `${sym} → USDC (stable hedge · PancakeSwap V2 · Chapel)`,
        payAsset: sym,
        receiveAsset: "USDC",
        tradable: true,
        requiresPermit: false,
      };
    }
    return {
      kind: "none",
      side: "hold",
      path: hasRiskPosition
        ? `${sym} → tBNB available if USDC route fails`
        : "In stables/tBNB — spot desk cannot open naked short without perp leg",
      payAsset: "—",
      receiveAsset: "USDC",
      tradable: false,
      requiresPermit: false,
    };
  }

  return {
    kind: "none",
    side: "hold",
    path: "No size change — wait for gate + pulse alignment",
    payAsset: "—",
    receiveAsset: "—",
    tradable: false,
    requiresPermit: false,
  };
}

export function buildPositionRoute(input: {
  symbol: string;
  pulse: MarketPulse;
  derivatives?: BinanceDerivativesSnapshot | null;
  agentAction?: "BUY" | "SELL" | "HOLD" | null;
  hasRiskPosition?: boolean;
}): PositionRoute {
  const sym = input.symbol.toUpperCase();
  const direction = resolvePositionDirection(input);
  const execution = buildPositionExecution(direction, sym, input.hasRiskPosition ?? false);

  const reasoning: string[] = [];
  if (input.pulse.gateSignal) {
    reasoning.push(`Gate ${input.pulse.gateSignal.replace(/_/g, " ")} (${input.pulse.gateTier ?? "—"})`);
  }
  reasoning.push(`Pulse stress ${input.pulse.stressScore}/100 · ${input.pulse.cascadeLevel} cascade`);
  if (input.pulse.fearGreed != null) reasoning.push(`Fear & Greed ${input.pulse.fearGreed}`);
  if (input.derivatives) {
    reasoning.push(
      `Binance ${input.derivatives.symbol} funding ${input.derivatives.fundingRatePct} · OI ${
        input.derivatives.openInterestUsd != null
          ? `$${Math.round(input.derivatives.openInterestUsd / 1e6)}M`
          : "—"
      }`,
    );
  }
  if (input.agentAction) reasoning.push(`Agent signal ${input.agentAction}`);

  if (direction === "SHORT") {
    reasoning.push(
      "SHORT = spot-native stable hedge (sell/rotate to USDC) — not a perp short on this stack.",
    );
  }

  return {
    ok: true,
    symbol: sym,
    direction,
    confidence: dirConfidence(direction, input.pulse, input.pulse.gateTier),
    execution,
    reasoning,
    pulse: input.pulse,
    derivatives: input.derivatives ?? null,
    settlement: {
      network: "BSC Testnet (Chapel)",
      venue: "PancakeSwap V2",
      note:
        "Direction is enforced on-chain via wallet-signed swaps. Perp funding/OI is macro context only.",
    },
    generatedAt: new Date().toISOString(),
  };
}
