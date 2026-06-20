/**
 * Overview truth — hero signal follows selected horizon (live CMC).
 * Execution permit/router stays separate for Chapel settlement honesty.
 */
import type { GateJudgeConsensus } from "@/lib/gate-consensus-payload";
import type { GateBenchmarkFull } from "@/lib/gate-route-types";
import type { MeridianIntelligencePayload } from "@/lib/meridian-intelligence-types";
import {
  buildHorizonSummary,
  deskDirectionLabel,
  horizonDeskLabel,
  resolveHorizonContext,
  traderStanceToDirection,
  type DeskTraderStance,
  type GateHorizonId,
} from "@/lib/gate-desk-labels";
import type { PositionDirection, PositionRoute } from "@/lib/position-router";

export type GateOverviewTruth = {
  deskLabel: string;
  /** Hero direction — horizon live CMC when available */
  direction: PositionDirection;
  displayDirection: string;
  /** Constitution router — execution settlement only */
  executionDirection: PositionDirection;
  executionDisplay: DeskTraderStance;
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
  horizonLabel: string;
  liveBarSummary: string;
  horizonNote: string;
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
  displayDirection: DeskTraderStance | "—";
  horizonLabel: string;
  permit: "GRANT" | "DENY" | "WAIT";
  executionDirection: PositionDirection;
  sizeNote?: string | null;
  reviewHours?: number;
  anchorBar?: string | null;
}): string {
  const { direction, displayDirection, horizonLabel, permit, executionDirection, sizeNote, reviewHours, anchorBar } =
    input;
  const exec = deskDirectionLabel(executionDirection);
  const anchor = anchorBar ? ` (${anchorBar})` : "";

  if (displayDirection === "LONG") {
    if (permit !== "GRANT") {
      return `${horizonLabel} horizon leans LONG from live CMC${anchor} — do not add size until constitution GRANT (router ${exec}).`;
    }
    return sizeNote ?? `Tactical long on ${horizonLabel.toLowerCase()} horizon when Chapel liquidity confirms.`;
  }

  if (displayDirection === "EXIT") {
    return `${horizonLabel} horizon leans EXIT from live CMC${anchor} — reduce spot exposure; router ${exec} · permit ${permit}.`;
  }

  if (displayDirection === "HOLD") {
    if (permit === "DENY") {
      return `${horizonLabel} horizon HOLD — price within band on live CMC${anchor}. Constitution not cleared · router ${exec}.`;
    }
    return `No size on ${horizonLabel.toLowerCase()} horizon${anchor}. Review after ${reviewHours ?? 24}h or when permit clears.`;
  }

  if (direction === "FLAT") {
    if (permit === "DENY") {
      return "Awaiting live CMC timeframe sync — constitution has not cleared.";
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
  horizonId?: GateHorizonId;
}): GateOverviewTruth {
  const executionDirection = input.positionRoute?.direction ?? "FLAT";
  const executionDisplay = deskDirectionLabel(executionDirection);
  const permit = resolvePermit(input.judgeConsensus, input.intel);
  const riskRegime =
    input.intel?.genome.regime ??
    input.selected?.gate.regime ??
    input.selected?.skills?.regime?.regime ??
    "neutral";
  const horizonHours = input.intel?.convictionDecay.reviewAfterHours ?? 24;
  const checksPassed = input.selected?.gate.checksPassed ?? null;
  const checksTotal = input.selected?.gate.checksTotal ?? null;
  const tier = input.selected?.gate.tier ?? input.positionRoute?.gate?.tier ?? null;

  const horizonId = input.horizonId ?? "swing";
  const trendMetrics = (
    input.selected?.skills as { trend?: { metrics?: { change1h?: number; change24h?: number; change7d?: number } } } | undefined
  )?.trend?.metrics;
  const market = {
    change1h: trendMetrics?.change1h ?? (input.selected?.fieldSources?.change1h as number | undefined),
    change24h: trendMetrics?.change24h ?? input.selected?.market.change24h,
    change7d: trendMetrics?.change7d ?? input.selected?.market.change7d,
  };
  const horizonCtx = resolveHorizonContext(input.intel?.directionEvidence, horizonId, market);

  const displayDirection: DeskTraderStance =
    horizonCtx.dominantVote !== "—" ? horizonCtx.dominantVote : executionDisplay;
  const direction = traderStanceToDirection(displayDirection);
  const deskLabel =
    horizonCtx.dominantVote !== "—"
      ? horizonDeskLabel(horizonCtx.horizonLabel, displayDirection)
      : routerDeskLabel(executionDirection);

  const conviction =
    input.positionRoute?.confidence ??
    input.intel?.confidence.conviction ??
    input.selected?.gate.confidence ??
    "—";

  const summary = buildHorizonSummary({
    ctx: horizonCtx,
    executionStance: executionDisplay,
    permit,
    checksPassed,
    checksTotal,
  });

  const updatedAt =
    input.intel?.generatedAt ??
    input.positionRoute?.generatedAt ??
    new Date().toISOString();

  return {
    deskLabel,
    direction,
    displayDirection,
    executionDirection,
    executionDisplay,
    permit,
    riskRegime,
    conviction,
    horizonHours,
    summary,
    primaryAction: resolvePrimaryAction({
      direction,
      displayDirection,
      horizonLabel: horizonCtx.horizonLabel,
      permit,
      executionDirection,
      sizeNote: input.positionRoute?.sizeNote,
      reviewHours: typeof horizonHours === "number" ? horizonHours : 24,
      anchorBar: horizonCtx.anchorBar,
    }),
    updatedAt,
    constitutionBias: constitutionBiasLabel(input.judgeConsensus),
    checksPassed,
    checksTotal,
    tier,
    horizonLabel: horizonCtx.horizonLabel,
    liveBarSummary: horizonCtx.liveVoteSummary,
    horizonNote: horizonCtx.note,
  };
}
