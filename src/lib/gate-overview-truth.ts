/**
 * Overview ONE TRUTH — only the position router verdict is the final signal.
 * Constitution bias, momentum, skills, and agent pulse are explanations, not competing headlines.
 */
import type { GateJudgeConsensus } from "@/lib/gate-consensus-payload";
import type { GateBenchmarkFull } from "@/lib/gate-route-types";
import type { MeridianIntelligencePayload } from "@/lib/meridian-intelligence-types";
import type { PositionDirection, PositionRoute } from "@/lib/position-router";

export type GateOverviewTruth = {
  deskLabel: string;
  direction: PositionDirection;
  permit: "GRANT" | "DENY" | "WAIT";
  riskRegime: string;
  conviction: number | string;
  horizonHours: number | string;
  summary: string;
  primaryAction: string;
  updatedAt: string;
  constitutionBias: string;
  checksPassed: number | null;
  checksTotal: number | null;
  tier: string | null;
};

export function routerDeskLabel(direction: PositionDirection): string {
  if (direction === "LONG") return "DESK LONG";
  if (direction === "SHORT") return "DESK SHORT";
  return "DESK HOLD";
}

function resolvePermit(
  judgeConsensus: GateJudgeConsensus | null | undefined,
  intel: MeridianIntelligencePayload | null,
): "GRANT" | "DENY" | "WAIT" {
  const fromConsensus = judgeConsensus?.permit.status;
  if (fromConsensus === "GRANT" || fromConsensus === "DENY" || fromConsensus === "WAIT") return fromConsensus;
  if (intel?.verdict === "GRANT") return "GRANT";
  if (intel?.verdict === "DENY") return "DENY";
  return "WAIT";
}

function constitutionBiasLabel(judgeConsensus: GateJudgeConsensus | null | undefined): string {
  if (!judgeConsensus?.weights) return "Bias pending";
  const { longPct, bearPct, holdPct } = judgeConsensus.weights;
  if (longPct >= bearPct + 12) return `Bias favors long (${longPct}% long weight)`;
  if (bearPct >= longPct + 12) return `Bias favors de-risk (${bearPct}% bear weight)`;
  if (holdPct >= 40) return `Bias mixed · ${holdPct}% hold weight`;
  return "Bias neutral";
}

export function resolvePrimaryAction(input: {
  direction: PositionDirection;
  permit: "GRANT" | "DENY" | "WAIT";
  sizeNote?: string | null;
  reviewHours?: number;
  verdict?: string;
}): string {
  const { direction, permit, sizeNote, reviewHours, verdict } = input;

  if (direction === "FLAT") {
    if (permit === "DENY") {
      return "No position. Constitution has not cleared — wait for alignment.";
    }
    if (verdict?.toLowerCase().includes("stress") || verdict?.toLowerCase().includes("elevated")) {
      return "No position. Elevated stress — review after next 1h rollover.";
    }
    return `No position. Review after ${reviewHours ?? 24}h or when permit clears.`;
  }

  if (direction === "LONG") {
    if (permit !== "GRANT") {
      return "Do not add size — router is long-lean but permit has not cleared.";
    }
    return sizeNote ?? "Open tactical long on Chapel when liquidity confirms.";
  }

  if (direction === "SHORT") {
    return sizeNote ?? "Reduce exposure or rotate to USDC. Monitor liquidity and cascade.";
  }

  return "Monitor — no action required.";
}

export function resolveGateOverviewTruth(input: {
  positionRoute: PositionRoute | null;
  judgeConsensus: GateJudgeConsensus | null;
  intel: MeridianIntelligencePayload | null;
  selected?: GateBenchmarkFull;
}): GateOverviewTruth {
  const direction = input.positionRoute?.direction ?? "FLAT";
  const permit = resolvePermit(input.judgeConsensus, input.intel);
  const riskRegime =
    input.intel?.genome.regime ??
    input.selected?.gate.regime ??
    input.selected?.skills?.regime?.regime ??
    "neutral";
  const conviction =
    input.positionRoute?.confidence ??
    input.intel?.confidence.conviction ??
    input.selected?.gate.confidence ??
    "—";
  const horizonHours = input.intel?.convictionDecay.reviewAfterHours ?? 24;
  const summary =
    input.positionRoute?.verdict ??
    input.intel?.explainability.why ??
    input.selected?.gate.thesis ??
    "Awaiting router synthesis.";
  const updatedAt =
    input.positionRoute?.generatedAt ??
    input.intel?.generatedAt ??
    new Date().toISOString();

  return {
    deskLabel: routerDeskLabel(direction),
    direction,
    permit,
    riskRegime,
    conviction,
    horizonHours,
    summary,
    primaryAction: resolvePrimaryAction({
      direction,
      permit,
      sizeNote: input.positionRoute?.sizeNote,
      reviewHours: typeof horizonHours === "number" ? horizonHours : 24,
      verdict: summary,
    }),
    updatedAt,
    constitutionBias: constitutionBiasLabel(input.judgeConsensus),
    checksPassed: input.selected?.gate.checksPassed ?? null,
    checksTotal: input.selected?.gate.checksTotal ?? null,
    tier: input.selected?.gate.tier ?? input.positionRoute?.gate?.tier ?? null,
  };
}
