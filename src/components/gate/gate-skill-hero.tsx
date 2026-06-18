"use client";

import { GateSignalCanvas } from "@/components/gate/gate-signal-canvas";
import { GATE_PRODUCT } from "@/lib/gate-product-copy";
import type { GateRoutePayload } from "@/lib/gate-route-types";

export function GateSkillHero({
  route,
  cmcLive,
}: {
  route: GateRoutePayload | null;
  cmcLive: boolean;
}) {
  return (
    <section className="gate-skill-hero">
      <GateSignalCanvas />
      <div className="gate-skill-hero-content">
        <div className="gate-skill-eyebrow">
          <span className="gate-pulse-dot" />
          CMC strategy skill · live harness
        </div>
        <h1>
          Turn market data into
          <br />
          <span>backtestable strategy</span>
        </h1>
        <p className="gate-skill-hero-desc">
          Configure BSC benchmarks on the left — the right panel shows deterministic entry, filter, and exit rules from
          the same engine that powers historical replay and NEXUS execution. No generated stats; every number is from
          CMC + your rule set.
        </p>
        {route && (
          <p className="mt-3 font-mono text-[11px] text-[var(--gate-muted)]">
            Router · {route.regime.replace(/-/g, " ")} · sentiment {route.fearGreed} · feed{" "}
            {cmcLive ? "live" : "stale"}
          </p>
        )}
      </div>
    </section>
  );
}

export function GateSkillHeader() {
  return (
    <header className="gate-skill-header">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg font-mono text-sm font-bold"
          style={{ background: "var(--gate-amber)", color: "var(--gate-void)" }}
        >
          Σ
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide">{GATE_PRODUCT.title}</p>
          <p className="font-mono text-[10px] text-[var(--gate-muted)]">MERIDIAN · strategy skill desk</p>
        </div>
      </div>
      <span className="gate-skill-badge">Backtestable spec</span>
    </header>
  );
}
