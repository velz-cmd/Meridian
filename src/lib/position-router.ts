/**
 * Spot-native direction router — LONG / FLAT / SHORT-via-stable on BSC Testnet.
 *
 * Priority (deterministic, not LLM):
 *   1. Constitution gate (CMC → nexus-gate.mjs) — primary
 *   2. Cascade safety overlay (CMC global + BTC shock proxy)
 *   3. Binance funding/OI — macro context only
 *   4. Wallet execution path (PancakeSwap V2 · Chapel)
 *
 * SHORT = rotate risk asset → USDC, not synthetic perp PnL.
 */

import type { BinanceDerivativesSnapshot } from "./binance-derivatives-context";
import { fundingDirectionBias } from "./binance-derivatives-context";
import type { MarketPulse } from "./market-pulse";
import { gateSymbolTradableOnTestnet } from "./gate-product-copy";
import { isGateSymbol } from "./gate-constants";

export type PositionDirection = "LONG" | "SHORT" | "FLAT";

/** Wallet action on spot desk — not the same as futures/perp short. */
export type SpotDeskAction = "buy" | "sell" | "hold";

export type PositionExecutionKind = "none" | "long_tbnb" | "short_stable" | "exit_tbnb";

export type DirectionLayerStatus = "pass" | "warn" | "block" | "neutral";

export type DirectionLayer = {
  id: "gate" | "cascade" | "funding" | "execution";
  label: string;
  source: string;
  status: DirectionLayerStatus;
  detail: string;
};

export type PositionExecution = {
  kind: PositionExecutionKind;
  side: "buy" | "sell" | "rotate" | "hold";
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
  confidence: number | null;
  verdict: string;
  sizeNote: string | null;
  method: string;
  layers: DirectionLayer[];
  execution: PositionExecution;
  reasoning: string[];
  pulse: MarketPulse;
  derivatives: BinanceDerivativesSnapshot | null;
  gate: {
    signal: string;
    tier: string;
    confidence: number | null;
    regime: string | null;
  } | null;
  /** Spot desk action mapped from strategy — Buy/Sell/Hold, not "Execute LONG". */
  spotAction: SpotDeskAction;
  spotActionLabel: string;
  settlement: {
    network: string;
    venue: string;
    note: string;
  };
  generatedAt: string;
};

export type GateOverlay = {
  signal: string;
  tier: string;
  confidence?: number;
  checksPassed?: number;
  checksTotal?: number;
  regime?: string;
};

function layerStatusIcon(s: DirectionLayerStatus): string {
  if (s === "pass") return "✓";
  if (s === "warn") return "!";
  if (s === "block") return "✕";
  return "·";
}

function computeConfidence(
  direction: PositionDirection,
  gate: GateOverlay | null,
  pulse: MarketPulse,
  fundingWarn: boolean,
): number | null {
  if (direction === "FLAT") {
    if (gate?.confidence != null) return Math.round(Math.min(92, Math.max(38, gate.confidence)));
    return null;
  }

  let c = gate?.confidence ?? 62;
  if (direction === "LONG") {
    if (gate?.tier === "a-plus") c = Math.max(c, 74);
    else if (gate?.tier === "a") c = Math.max(c, 66);
    if (pulse.cascadeLevel === "elevated") c -= 10;
    if (fundingWarn) c -= 4;
  } else if (direction === "SHORT") {
    c = pulse.cascadeLevel === "extreme" ? 80 : pulse.cascadeLevel === "elevated" ? 72 : 64;
    if (gate?.signal === "EXIT" || gate?.signal === "AVOID") c += 6;
  }
  return Math.round(Math.min(92, Math.max(38, c)));
}

export function resolvePositionDirection(input: {
  pulse: MarketPulse;
  derivatives?: BinanceDerivativesSnapshot | null;
  agentAction?: "BUY" | "SELL" | "HOLD" | null;
  gate?: GateOverlay | null;
  hasRiskPosition?: boolean;
}): {
  direction: PositionDirection;
  verdict: string;
  sizeNote: string | null;
  layers: DirectionLayer[];
  reasoning: string[];
} {
  const { pulse, derivatives, agentAction, hasRiskPosition } = input;
  const gateSignal = input.gate?.signal ?? pulse.gateSignal ?? "HOLD";
  const gateTier = input.gate?.tier ?? pulse.gateTier ?? "—";
  const gateRegime = input.gate?.regime ?? pulse.macro?.label ?? null;
  const fundingBias = derivatives ? fundingDirectionBias(derivatives.fundingRate) : null;
  const fundingWarn = fundingBias === "long_crowded";

  const layers: DirectionLayer[] = [
    {
      id: "gate",
      label: "Constitution gate",
      source: "CMC → nexus-gate.mjs (deterministic)",
      status:
        gateSignal === "ENTER_LONG"
          ? "pass"
          : gateSignal === "HOLD"
            ? "neutral"
            : "block",
      detail: `${gateSignal.replace(/_/g, " ")} · tier ${gateTier}${gateRegime ? ` · ${gateRegime}` : ""}`,
    },
    {
      id: "cascade",
      label: "Cascade safety",
      source: "CMC global mcap × BTC hourly shock (labeled proxy)",
      status:
        pulse.cascadeLevel === "extreme"
          ? "block"
          : pulse.cascadeLevel === "elevated"
            ? "warn"
            : "pass",
      detail: `Stress ${pulse.stressScore}/100 · ${pulse.cascadeLevel} cascade`,
    },
  ];

  if (derivatives) {
    layers.push({
      id: "funding",
      label: "Perp funding / OI",
      source: "binance-fapi/public (read-only)",
      status: fundingWarn ? "warn" : "neutral",
      detail: `${derivatives.symbol} ${derivatives.fundingRatePct}${
        derivatives.openInterestUsd != null
          ? ` · OI ~$${Math.round(derivatives.openInterestUsd / 1e6)}M`
          : ""
      } — macro context, not execution`,
    });
  }

  const reasoning: string[] = [
    `Gate ${gateSignal.replace(/_/g, " ")} (${gateTier}) from live CMC bar`,
    `Cascade ${pulse.cascadeLevel} · stress ${pulse.stressScore}/100`,
  ];
  if (pulse.fearGreed != null) reasoning.push(`Fear & Greed ${pulse.fearGreed} (CMC)`);
  if (derivatives) {
    reasoning.push(`Binance funding ${derivatives.fundingRatePct} — tilt only`);
  }

  let direction: PositionDirection = "FLAT";
  let verdict = "Gate HOLD — stay flat until entry rules align.";
  let sizeNote: string | null = null;

  const forceDeRisk =
    gateSignal === "EXIT" ||
    gateSignal === "AVOID" ||
    agentAction === "SELL" ||
    pulse.cascadeLevel === "extreme";

  if (forceDeRisk) {
    direction = hasRiskPosition ? "SHORT" : "FLAT";
    verdict = hasRiskPosition
      ? gateSignal === "EXIT" || gateSignal === "AVOID"
        ? "Gate exit — rotate risk asset to USDC on Chapel."
        : "Extreme cascade — hedge open risk via stable rotate."
      : "Defensive flat — no risk asset held; stay in tBNB/stables.";
    reasoning.push(
      direction === "SHORT"
        ? "SHORT = spot hedge (asset → USDC), not perp."
        : "No position to rotate — flat is correct.",
    );
  } else if (gateSignal === "ENTER_LONG") {
    if (pulse.cascadeLevel === "elevated" && pulse.stressScore >= 55) {
      direction = hasRiskPosition ? "SHORT" : "FLAT";
      verdict = hasRiskPosition
        ? "Elevated stress — gate cleared but tape hot; hedge existing size."
        : "Elevated stress — gate long signal but wait before new size.";
      reasoning.push("Cascade overlay blocks fresh long until stress < 55.");
    } else {
      direction = "LONG";
      verdict =
        pulse.cascadeLevel === "elevated"
          ? "A/A+ gate clears tactical long — size reduced until stress normalizes."
          : "Constitution ENTER LONG — deploy tBNB → asset on PancakeSwap Chapel.";
      sizeNote =
        gateRegime === "risk-off" || pulse.macro?.label === "risk-off"
          ? "Risk-off regime — gate already sized thesis small; trail 1h invalidation."
          : pulse.cascadeLevel === "elevated"
            ? "Elevated cascade — use ≤50% of usual autopilot size."
            : fundingWarn
              ? "Crowded long funding — consider smaller clip."
              : null;
      reasoning.push("Gate is primary; risk-off is in the thesis, not a veto.");
    }
  } else if (agentAction === "BUY" && pulse.cascadeLevel === "normal") {
    direction = "LONG";
    verdict = "Agent BUY + normal cascade — tactical long when constitution GRANTs.";
  }

  layers.push({
    id: "execution",
    label: "Settlement direction",
    source: "PancakeSwap V2 · BSC Testnet",
    status: direction === "FLAT" ? "neutral" : direction === "LONG" ? "pass" : "warn",
    detail: `${direction} · ${direction === "SHORT" ? "asset → USDC" : direction === "LONG" ? "tBNB → asset" : "no new size"}`,
  });

  return { direction, verdict, sizeNote, layers, reasoning };
}

export function buildPositionExecution(
  direction: PositionDirection,
  symbol: string,
  hasRiskPosition: boolean,
  verdict: string,
): PositionExecution {
  const sym = symbol.toUpperCase();
  const tradable = gateSymbolTradableOnTestnet(sym);
  const bench = isGateSymbol(sym);

  if (direction === "LONG") {
    return {
      kind: "long_tbnb",
      side: "buy",
      path: tradable ? `tBNB → ${sym} (PancakeSwap V2 · Chapel)` : `${sym} — evaluate only (no Chapel pair)`,
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
      path: verdict,
      payAsset: "—",
      receiveAsset: "USDC",
      tradable: false,
      requiresPermit: false,
    };
  }

  return {
    kind: "none",
    side: "hold",
    path: verdict,
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
  gate?: GateOverlay | null;
}): PositionRoute {
  const sym = input.symbol.toUpperCase();
  const resolved = resolvePositionDirection(input);
  const execution = buildPositionExecution(
    resolved.direction,
    sym,
    input.hasRiskPosition ?? false,
    resolved.verdict,
  );
  const fundingWarn = input.derivatives
    ? fundingDirectionBias(input.derivatives.fundingRate) === "long_crowded"
    : false;

  const gateSignal = input.gate?.signal ?? input.pulse.gateSignal ?? "HOLD";
  const gateTier = input.gate?.tier ?? input.pulse.gateTier ?? "—";

  const spotAction = resolveSpotDeskAction(resolved.direction, execution);
  const spotActionLabel = spotDeskActionLabel(spotAction, sym);

  return {
    ok: true,
    symbol: sym,
    direction: resolved.direction,
    confidence: computeConfidence(resolved.direction, input.gate ?? null, input.pulse, fundingWarn),
    verdict: resolved.verdict,
    sizeNote: resolved.sizeNote,
    method:
      "Deterministic stack: CMC gate engine → cascade safety → Binance funding (context) → wallet swap.",
    layers: resolved.layers,
    execution,
    reasoning: resolved.reasoning,
    pulse: input.pulse,
    derivatives: input.derivatives ?? null,
    gate: input.gate
      ? {
          signal: gateSignal,
          tier: gateTier,
          confidence: input.gate.confidence ?? null,
          regime: input.gate.regime ?? null,
        }
      : gateSignal
        ? {
            signal: gateSignal,
            tier: gateTier,
            confidence: null,
            regime: input.pulse.macro?.label ?? null,
          }
        : null,
    spotAction,
    spotActionLabel,
    settlement: {
      network: "BSC Testnet (Chapel)",
      venue: "PancakeSwap V2",
      note: "On-chain = wallet-signed swaps only. Permit GRANT is server-side constitution, not a contract.",
    },
    generatedAt: new Date().toISOString(),
  };
}

export { layerStatusIcon };

export function resolveSpotDeskAction(
  direction: PositionDirection,
  execution: PositionExecution,
): SpotDeskAction {
  if (execution.kind === "long_tbnb") return "buy";
  if (execution.kind === "short_stable" || execution.kind === "exit_tbnb") return "sell";
  if (direction === "LONG") return "buy";
  if (direction === "SHORT") return "sell";
  return "hold";
}

export function spotDeskActionLabel(action: SpotDeskAction, symbol: string): string {
  const sym = symbol.toUpperCase();
  if (action === "buy") return `Buy ${sym} · spot long exposure`;
  if (action === "sell") return `Sell ${sym} · spot exit / reduce`;
  return "Hold flat · no spot size change";
}

export function positionExposureLabel(direction: PositionDirection): string {
  if (direction === "LONG") return "Long exposure";
  if (direction === "SHORT") return "Short exposure (exit bias on spot)";
  return "Flat · no position";
}
