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
  displayDirection: DeskTraderStance | "—";
  windowLabel: string;
  changeLabel: string;
  permit: "GRANT" | "DENY" | "WAIT";
  sizeNote?: string | null;
  reviewHours?: number;
}): string {
  const { displayDirection, windowLabel, changeLabel, permit, sizeNote, reviewHours } = input;
  const window = `${windowLabel} ${changeLabel}`;

  if (permit === "GRANT") {
    if (displayDirection === "EXIT") {
      return sizeNote ?? `Trim into strength — ${window} trend, permit GRANT. Reduce on Chapel.`;
    }
    return sizeNote ?? `Entry cleared — ${window} trend, permit GRANT. Size on Chapel when liquidity confirms.`;
  }

  if (displayDirection === "LONG") {
    return `${window} trend is up, but permit ${permit} — wait for constitution to clear before adding size.`;
  }
  if (displayDirection === "EXIT") {
    return `${window} trend is down — de-risk or stay out. Permit ${permit}, no fresh entry.`;
  }
  if (displayDirection === "HOLD") {
    return `${window} flat (${changeLabel}) and permit ${permit} — no edge. Review after ${reviewHours ?? 24}h.`;
  }
  return "Live CMC timeframe data syncing — no action until a window prints.";
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

  const horizonId = input.horizonId ?? "daily";
  const trendMetrics = (
    input.selected?.skills as
      | { trend?: { metrics?: { change1h?: number; change24h?: number; change7d?: number; change30d?: number | null } } }
      | undefined
  )?.trend?.metrics;
  const market = {
    change1h: trendMetrics?.change1h ?? (input.selected?.fieldSources?.change1h as number | undefined),
    change24h: trendMetrics?.change24h ?? input.selected?.market.change24h,
    change7d: trendMetrics?.change7d ?? input.selected?.market.change7d,
    change30d: trendMetrics?.change30d ?? undefined,
  };
  const horizonCtx = resolveHorizonContext(input.intel?.directionEvidence, horizonId, market);

  const displayDirection: DeskTraderStance =
    horizonCtx.dominantVote !== "—" ? horizonCtx.dominantVote : "HOLD";
  const direction = traderStanceToDirection(displayDirection);
  const deskLabel = horizonDeskLabel(horizonCtx.windowLabel);

  const conviction =
    input.positionRoute?.confidence ??
    input.intel?.confidence.conviction ??
    input.selected?.gate.confidence ??
    "—";

  const summary = buildHorizonSummary({
    ctx: horizonCtx,
    symbol: (input.selected?.symbol ?? input.intel?.symbol ?? "").toUpperCase(),
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
      displayDirection,
      windowLabel: horizonCtx.windowLabel,
      changeLabel: horizonCtx.changeLabel,
      permit,
      sizeNote: input.positionRoute?.sizeNote,
      reviewHours: typeof horizonHours === "number" ? horizonHours : 24,
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
