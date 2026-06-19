"use client";

import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import type { GateBenchmarkFull } from "@/lib/gate-route-types";
import type { GateSkillsPayload } from "@/components/gate/gate-skill-stack";
import { strategySignalLabel } from "@/lib/gate-strategy-copy";
import { cn } from "@/lib/utils";

function FactorRow({
  label,
  detail,
  pass,
}: {
  label: string;
  detail: string;
  pass: boolean;
}) {
  const Icon = pass ? TrendingUp : TrendingDown;
  return (
    <div
      className={cn(
        "flex gap-2 rounded-lg border border-l-[3px] bg-black/30 px-3 py-2",
        pass ? "border-white/10 border-l-emerald-400" : "border-white/10 border-l-rose-400",
      )}
    >
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", pass ? "text-emerald-400" : "text-rose-400")} />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white">{label}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/65">{detail}</p>
      </div>
    </div>
  );
}

/** Deterministic constitution reasoning — same checks as engine, not LLM theatre. */
export function GateAgentReasoning({
  selected,
  skills,
}: {
  selected: GateBenchmarkFull;
  skills?: GateSkillsPayload | null;
}) {
  const gate = selected.gate;
  const checks = gate.checks ?? [];
  const signal = skills?.composite?.signal ?? gate.signal;
  const narrative =
    skills?.composite?.thesis ??
    gate.thesis ??
    `${selected.symbol}: ${strategySignalLabel(signal)} from live CMC bar.`;

  const blockers = skills?.composite?.blockers ?? gate.gaps ?? [];

  return (
    <section className="gate-agent-reasoning rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="arc-caption text-violet-200/80">Agent reasoning · constitution</p>
          <p className="text-sm font-semibold text-white">
            {signal.replace(/_/g, " ")} · {gate.confidence ?? skills?.composite.alignmentScore ?? "—"}% ·{" "}
            {gate.checksPassed}/{gate.checksTotal} checks
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 font-mono text-[9px] text-white/45">
          nexus-gate.mjs · not LLM
        </span>
      </div>

      <p className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-2.5 text-sm leading-relaxed text-white/90">
        {narrative}
      </p>

      {blockers.length > 0 && (
        <p className="mt-2 text-xs text-amber-200/90">
          Blockers: {blockers.join(" · ")}
        </p>
      )}

      {checks.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45">
            <Activity className="h-3 w-3" />
            Live check breakdown
          </p>
          {checks.map((c) => (
            <FactorRow key={c.id} label={c.label} detail={c.pass ? "Pass · weighted in agreement" : "Fail · blocks tier"} pass={c.pass} />
          ))}
        </div>
      )}

      {skills && (
        <p className="mt-3 text-[10px] leading-relaxed text-white/40">
          Skill stack (8): momentum {skills.momentum.signal.replace(/_/g, " ")} · sentiment{" "}
          {skills.sentiment.state.replace(/_/g, " ")} · regime {skills.regime.regime.replace(/-/g, " ")}
          {skills.trend ? ` · trend ${skills.trend.signal.replace(/_/g, " ")}` : ""}
          {skills.liquidity ? ` · liquidity ${skills.liquidity.signal.replace(/_/g, " ")}` : ""}
          {skills.structural ? ` · structure ${skills.structural.grade}` : ""}
          {skills.relativeStrength
            ? ` · RS ${skills.relativeStrength.role ?? "inline"} (${skills.relativeStrength.metrics?.rs24h?.toFixed(1) ?? "—"}% vs ${skills.relativeStrength.metrics?.benchmark ?? "BNB"})`
            : ""}
          {skills.volatility ? ` · vol ${skills.volatility.state ?? "—"}` : ""} · alignment{" "}
          {skills.composite.alignmentScore}/100.
        </p>
      )}
    </section>
  );
}
