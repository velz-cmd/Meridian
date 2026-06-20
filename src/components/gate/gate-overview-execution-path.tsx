"use client";

import { ArrowUpRight, Wallet } from "lucide-react";
import { GateCollapsibleCard } from "@/components/gate/gate-collapsible-card";
import { GateConnectStrip } from "@/components/gate/gate-connect-strip";
import type { GateArbitration } from "@/hooks/use-gate-permit";
import type { GatePermitStatus } from "@/lib/gate-permit-status";
import { deskDirectionLabel, deskExposureLabel } from "@/lib/gate-desk-labels";
import { GATE_PRODUCT } from "@/lib/gate-product-copy";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import type { GateBenchmarkFull, GateRoutePayload } from "@/lib/gate-route-types";
import type { PositionDirection, PositionRoute } from "@/lib/position-router";
import { nexusGlassCta } from "@/lib/nexus-action-glass";
import { GateSectionHead } from "@/components/gate/gate-section-head";
import { GateSectionLink } from "@/components/gate/gate-section-link";
import { Sparkles } from "lucide-react";

/** Overview execution — router verdict primary; one wallet card + link to Rules settlement desk. */
export function GateOverviewExecutionPath({
  symbol,
  selected,
  skills: _skills,
  positionRoute,
  directionLoading,
  gateRoute: _gateRoute,
  benchmarks: _benchmarks,
  permit,
  permitId,
  priceUsd,
  arbitration: _arbitration,
  primaryAction,
  routerDirection,
  deskLabel,
  onOpenNexus,
  onOpenAutopilot,
  track2Priority = false,
  onGoRules,
}: {
  symbol: string;
  selected?: GateBenchmarkFull;
  skills?: GateSkillsPayload;
  positionRoute: PositionRoute | null;
  directionLoading: boolean;
  gateRoute: GateRoutePayload | null;
  benchmarks: GateBenchmarkFull[];
  permit?: GatePermitStatus;
  permitId?: string | null;
  priceUsd?: number | null;
  arbitration?: GateArbitration | null;
  primaryAction: string;
  routerDirection: PositionDirection;
  deskLabel: string;
  onOpenNexus: () => void;
  onOpenAutopilot?: () => void;
  track2Priority?: boolean;
  onGoRules?: () => void;
}) {
  const displayDir = deskDirectionLabel(routerDirection);
  const exposureLabel = deskExposureLabel(routerDirection);

  const settlementCard = (
    <div className="space-y-3">
      <GateConnectStrip
        symbol={symbol}
        permit={permit}
        permitId={permitId}
        priceUsd={priceUsd}
        onOpenNexus={onOpenNexus}
        onOpenAutopilot={onOpenAutopilot}
        routerDirection={routerDirection}
        hideNexusButton
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3">
        <p className="text-xs text-white/55">
          Router: <span className="font-medium text-white">{displayDir}</span> · permit{" "}
          <span className="font-medium text-white">{permit ?? "WAIT"}</span>
          {directionLoading ? " · updating…" : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {routerDirection === "LONG" && permit === "GRANT" && onOpenAutopilot ? (
            <button
              type="button"
              onClick={onOpenAutopilot}
              className={nexusGlassCta(
                "autopilot",
                "min-h-[40px] px-4 py-2 text-xs font-semibold border-violet-400/40 bg-violet-500/15 text-violet-50",
              )}
            >
              Start autopilot
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpenNexus}
            className={nexusGlassCta(
              routerDirection === "LONG" && permit === "GRANT" ? "buy" : "swap",
              "min-h-[40px] px-4 py-2 text-xs font-semibold",
            )}
          >
            <span className="flex items-center gap-1.5">
              {routerDirection !== "LONG" || permit !== "GRANT" ? "Open NEXUS settlement" : GATE_PRODUCT.continueTradable(symbol)}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      </div>
      {onGoRules ? (
        <GateSectionLink onClick={onGoRules} features={["Position targets", "Leverage", "Capital rotation"]}>
          Full settlement desk on Rules tab
        </GateSectionLink>
      ) : null}
    </div>
  );

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-white/[0.08] bg-black/30 px-5 py-4 sm:px-6 sm:py-5">
        <GateSectionHead
          title={`${symbol} · ${exposureLabel}`}
          question="Primary action · router ONE TRUTH"
          kicker={deskLabel}
          icon={Sparkles}
        />
        <p className="gate-body-text mt-3 pl-[calc(0.75rem+3px)]">
          {primaryAction}
          {directionLoading ? " · updating…" : ""}
        </p>
        {track2Priority ? (
          <p className="gate-meta-text mt-3 pl-[calc(0.75rem+3px)] text-white/45">
            Technical · Memory · Rules · Replay explain this verdict. Wallet settlement is optional below — not Track 2
            scoring.
          </p>
        ) : null}
      </div>

      {track2Priority ? (
        <GateCollapsibleCard
          title="Wallet settlement"
          question="BSC Testnet · optional"
          icon={Wallet}
          accent="border-white/10"
          summary={`${symbol} · ${displayDir} · Chapel when permit clears`}
          defaultOpen={false}
        >
          {settlementCard}
        </GateCollapsibleCard>
      ) : (
        settlementCard
      )}
    </section>
  );
}
