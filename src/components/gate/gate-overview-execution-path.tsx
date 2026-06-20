"use client";

import { ArrowUpRight, Loader2, Wallet } from "lucide-react";
import { GateCapitalRotation } from "@/components/gate/gate-capital-rotation";
import { GateCollapsibleCard } from "@/components/gate/gate-collapsible-card";
import { GateExecutionDesk } from "@/components/gate/gate-execution-desk";
import { GateConnectStrip } from "@/components/gate/gate-connect-strip";
import { GatePermitArbitration } from "@/components/gate/gate-permit-arbitration";
import type { GateArbitration } from "@/hooks/use-gate-permit";
import type { GatePermitStatus } from "@/lib/gate-permit-status";
import { NexusDirectionDesk } from "@/components/nexus/nexus-direction-desk";
import { effectiveGateSignal } from "@/lib/gate-effective-signal";
import { GATE_PRODUCT } from "@/lib/gate-product-copy";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import type { GateBenchmarkFull, GateRoutePayload } from "@/lib/gate-route-types";
import type { PositionDirection, PositionRoute } from "@/lib/position-router";
import { positionExposureLabel } from "@/lib/position-router";
import { nexusGlassCta } from "@/lib/nexus-action-glass";
import { GateSectionHead } from "@/components/gate/gate-section-head";
import { Sparkles } from "lucide-react";

/** Overview execution — router verdict primary; execution collapsed in Track 2 mode. */
export function GateOverviewExecutionPath({
  symbol,
  selected,
  skills,
  positionRoute,
  directionLoading,
  gateRoute,
  benchmarks,
  permit,
  permitId,
  priceUsd,
  arbitration,
  primaryAction,
  routerDirection,
  deskLabel,
  onOpenNexus,
  onOpenAutopilot,
  track2Priority = false,
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
}) {
  const exposureLabel =
    routerDirection === "FLAT"
      ? "Flat · no position"
      : positionExposureLabel(routerDirection);

  const executionBlock = (
    <>
      <GateConnectStrip
        symbol={symbol}
        permit={permit}
        permitId={permitId}
        priceUsd={priceUsd}
        onOpenNexus={onOpenNexus}
        onOpenAutopilot={onOpenAutopilot}
        routerDirection={routerDirection}
      />
      <div className="gate-execution-cta flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-black/30 px-5 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <GateSectionHead
            title={`${symbol} · ${exposureLabel}`}
            question="Primary action · router verdict"
            kicker={deskLabel}
            icon={Sparkles}
          />
          <p className="gate-body-text mt-3 pl-[calc(0.75rem+3px)]">
            {primaryAction}
            {directionLoading ? " · updating…" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {routerDirection === "LONG" && permit === "GRANT" && onOpenAutopilot ? (
            <button
              type="button"
              onClick={onOpenAutopilot}
              className={nexusGlassCta(
                "autopilot",
                "min-h-[44px] px-5 py-2.5 text-sm font-semibold border-violet-400/40 bg-violet-500/15 text-violet-50",
              )}
            >
              <span className="flex items-center gap-1.5">
                Start gate autopilot
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpenNexus}
            className={nexusGlassCta(
              routerDirection === "LONG" && permit === "GRANT" ? "buy" : "swap",
              "min-h-[44px] px-5 py-2.5 text-sm font-semibold",
            )}
          >
            <span className="flex items-center gap-1.5">
              {routerDirection === "FLAT" || permit === "DENY" || permit === "WAIT"
                ? "Review in NEXUS"
                : GATE_PRODUCT.continueTradable(symbol)}
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
      <GateCollapsibleCard
        title="Full execution desk"
        question="Lanes · leverage · settlement"
        icon={Sparkles}
        accent="border-violet-400/15"
        summary="Expand for position targets, thesis leverage, and NEXUS Chapel settlement."
        defaultOpen={false}
      >
        {directionLoading && !positionRoute ? (
          <div className="flex items-center gap-2 py-4 text-xs text-white/50">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
            Loading position signal…
          </div>
        ) : (
          <div className="space-y-4">
            <GateExecutionDesk
              symbol={symbol}
              route={positionRoute}
              loading={directionLoading}
              deskSignal={selected ? effectiveGateSignal(selected.gate, skills) : undefined}
              permit={permit === "WAIT" ? undefined : permit}
              compact
            />
            <NexusDirectionDesk route={positionRoute} loading={directionLoading} compact strategyOnly />
            <GateCapitalRotation benchmarks={benchmarks} route={gateRoute} />
          </div>
        )}
      </GateCollapsibleCard>
    </>
  );

  return (
    <section className="space-y-3">
      {arbitration ? (
        <GatePermitArbitration
          symbol={symbol}
          arbitration={arbitration}
          granted={permit === "GRANT"}
          priceUsd={priceUsd ?? undefined}
        />
      ) : null}

      {track2Priority ? (
        <GateCollapsibleCard
          title="Optional execution"
          question="Not Track 2 deliverable"
          icon={Wallet}
          accent="border-white/10"
          summary="BSC Testnet Chapel settlement · any wallet · progressive disclosure only."
          defaultOpen={false}
        >
          {executionBlock}
        </GateCollapsibleCard>
      ) : (
        executionBlock
      )}
    </section>
  );
}
