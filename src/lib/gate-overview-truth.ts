/**
 * Overview truth — hero follows selected horizon (live CMC desk state).
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
} from "@/lib/gate-desk-labels";
import type { GateHorizonId } from "@/lib/gate-desk-labels";
import {
  buildCourtDeskSummary,
  buildFourPillars,
  convictionBand,
  convictionBandDetail,
  resolveReviewHoursLabel,
  resolveVerdictTier,
  type CourtDeskSummary,
  type DeskVerdictTier,
  type FourPillar,
  type SpotDeskState,
} from "@/lib/meridian-desk-states";
import type { PositionDirection, PositionRoute } from "@/lib/position-router";

export type GateOverviewTruth = {
  deskLabel: string;
  direction: PositionDirection;
  displayDirection: SpotDeskState;
  verdictTier: DeskVerdictTier;
  convictionBand: ReturnType<typeof convictionBand>;
  reviewLabel: string;
  executionDirection: PositionDirection;
  executionDisplay: SpotDeskState;
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
  courtSummary: CourtDeskSummary | null;
  pillars: FourPillar[];
};

export function routerDeskLabel(direction: PositionDirection): string {
  const state = deskDirectionLabel(direction);
  return `DESK ${state}`;
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
  if (longPct >= bearPct + 12) return `Long weight ${longPct}%`;
  if (bearPct >= longPct + 12) return `Bear weight ${bearPct}%`;
  if (holdPct >= 40) return `Mixed · ${holdPct}% neutral weight`;
  return "Neutral weight";
}

export function resolvePrimaryAction(input: {
  displayDirection: SpotDeskState | "—";
  windowLabel: string;
  changeLabel: string;
  permit: "GRANT" | "DENY" | "WAIT";
  verdictTier: DeskVerdictTier;
  sizeNote?: string | null;
  reviewHours?: number;
}): string {
  const { displayDirection, windowLabel, changeLabel, permit, verdictTier, sizeNote, reviewHours } = input;
  const window = `${windowLabel} ${changeLabel}`;
  const review = resolveReviewHoursLabel(reviewHours);

  if (displayDirection === "—") {
    return "Live CMC timeframe data syncing — no action until a window prints.";
  }

  switch (displayDirection) {
    case "ACCUMULATE":
      return permit === "GRANT"
        ? sizeNote ?? `Accumulate zone — ${window}. ${verdictTier}. ${review}.`
        : `${window} favors accumulation, but permit ${permit} — wait for constitution. ${review}.`;
    case "HOLD POSITION":
      return `Hold position — ${window} trend intact. ${review}.`;
    case "REDUCE":
      return `Reduce exposure — ${window} momentum weakening. Permit ${permit}. ${review}.`;
    case "EXIT":
      return `Exit — ${window} thesis failing. No fresh size. ${review}.`;
    case "WAIT":
    default:
      return `No edge — ${window} mixed or flat. ${verdictTier}. ${review}.`;
  }
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
  const horizonHours =
    typeof input.intel?.convictionDecay.reviewAfterHours === "number"
      ? input.intel.convictionDecay.reviewAfterHours
      : 24;
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

  const displayDirection: SpotDeskState =
    horizonCtx.dominantVote !== "—" ? horizonCtx.dominantVote : "WAIT";
  const direction = traderStanceToDirection(displayDirection);
  const deskLabel = horizonDeskLabel(horizonCtx.horizonLabel);

  const convictionNum =
    typeof input.positionRoute?.confidence === "number"
      ? input.positionRoute.confidence
      : typeof input.intel?.confidence.conviction === "number"
        ? input.intel.confidence.conviction
        : typeof input.selected?.gate.confidence === "number"
          ? input.selected.gate.confidence
          : null;

  const conviction = convictionNum ?? "—";
  const band = convictionBand(convictionNum);

  const longLayerCount =
    input.judgeConsensus?.layers.filter((l) => l.signal === "ENTER_LONG").length ?? 0;
  const bearLayerCount =
    input.judgeConsensus?.layers.filter((l) => l.signal === "EXIT" || l.signal === "AVOID").length ?? 0;

  const verdictTier = resolveVerdictTier({
    longScore: input.intel?.directionEvidence?.longScore ?? 0,
    shortScore: input.intel?.directionEvidence?.shortScore ?? 0,
    longLayerCount,
    bearLayerCount,
    conviction: convictionNum ?? 0,
    conflict: input.intel?.directionEvidence?.conflict ?? "moderate",
    vetoes: input.intel?.directionEvidence?.vetoes ?? [],
    permit,
  });

  const courtSummary = input.intel
    ? buildCourtDeskSummary({
        court: input.intel.bullBearCourt,
        consensus: input.judgeConsensus,
        verdictTier,
      })
    : null;

  const skillsAny = input.selected?.skills as
    | {
        trend?: { signal?: string };
        liquidity?: { signal?: string };
        relativeStrength?: { signal?: string };
      }
    | undefined;

  const pillars = buildFourPillars({
    regime: riskRegime,
    trendSignal: skillsAny?.trend?.signal ?? input.selected?.gate.signal,
    rsSignal: skillsAny?.relativeStrength?.signal,
    liquiditySignal: skillsAny?.liquidity?.signal,
    fearGreed: input.intel?.genome.fearGreed ?? input.selected?.market.fearGreed,
  });

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
    verdictTier,
    convictionBand: band,
    reviewLabel: resolveReviewHoursLabel(typeof horizonHours === "number" ? horizonHours : 24),
    executionDirection,
    executionDisplay,
    permit,
    riskRegime,
    conviction,
    horizonHours,
    summary: `${summary} Conviction: ${band} — ${convictionBandDetail(band)}`,
    primaryAction: resolvePrimaryAction({
      displayDirection,
      windowLabel: horizonCtx.windowLabel,
      changeLabel: horizonCtx.changeLabel,
      permit,
      verdictTier,
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
    courtSummary,
    pillars,
  };
}
