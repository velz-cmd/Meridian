"use client";

import { ArrowUpRight, Loader2 } from "lucide-react";
import { GateCapitalRotation } from "@/components/gate/gate-capital-rotation";
import { GateCollapsibleCard } from "@/components/gate/gate-collapsible-card";
import { GateExecutionDesk } from "@/components/gate/gate-execution-desk";
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

/** Overview execution — instructions aligned with router verdict only. */
export function GateOverviewExecutionPath({
  symbol,
  selected,
  skills,
  positionRoute,
  directionLoading,
  gateRoute,
  benchmarks,
  permit,
  primaryAction,
  routerDirection,
  deskLabel,
  onOpenNexus,
  onOpenAutopilot,
}: {
  symbol: string;
  selected?: GateBenchmarkFull;
  skills?: GateSkillsPayload;
  positionRoute: PositionRoute | null;
  directionLoading: boolean;
  gateRoute: GateRoutePayload | null;
  benchmarks: GateBenchmarkFull[];
  permit?: "GRANT" | "DENY";
  primaryAction: string;
  routerDirection: PositionDirection;
  deskLabel: string;
  onOpenNexus: () => void;
  onOpenAutopilot?: () => void;
}) {
  const exposureLabel =
    routerDirection === "FLAT"
      ? "Flat · no position"
      : positionExposureLabel(routerDirection);

  return (
    <section className="space-y-3">
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
              {routerDirection === "FLAT" || permit === "DENY"
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
              permit={permit}
              compact
            />
            <NexusDirectionDesk route={positionRoute} loading={directionLoading} compact strategyOnly />
            <GateCapitalRotation benchmarks={benchmarks} route={gateRoute} />
          </div>
        )}
      </GateCollapsibleCard>
    </section>
  );
}
